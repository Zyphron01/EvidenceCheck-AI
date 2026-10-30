import type { NextRequest } from "next/server";
import { InvestigateRequestSchema } from "../../types/investigation.ts";
import { validateNvidiaConfiguration, NvidiaClientError } from "../ai/nvidia.ts";
import {
  getTavilyBudgetStatus,
  validateTavilyConfiguration,
  TavilyClientError,
} from "../research/tavily.ts";
import { reserveDurableSearchBudget } from "../db/storage.ts";
import { runInvestigationPipeline } from "./pipeline.ts";

// In-memory rate limiting: Map<clientIp, { count: number; resetAt: number }>
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

// In-memory set of normalized claims currently in-flight
const activeInFlightClaims = new Set<string>();

export function normalizeClaim(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getClientIp(req: NextRequest | Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  return req.headers.get("x-real-ip") || "127.0.0.1";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  entry.count += 1;
  return { allowed: true };
}

export async function handleInvestigateRequest(req: NextRequest | Request): Promise<Response> {
  const clientIp = getClientIp(req);

  // 1. In-memory Rate Limit Check
  const rateLimitResult = checkRateLimit(clientIp);
  if (!rateLimitResult.allowed) {
    return Response.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: `Rate limit exceeded. Maximum ${MAX_REQUESTS_PER_WINDOW} requests per minute.`,
          details: { retryAfterSeconds: rateLimitResult.retryAfterSeconds },
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitResult.retryAfterSeconds ?? 60) },
      }
    );
  }

  // 2. Parse & Validate Request Body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid JSON body provided.",
        },
      },
      { status: 400 }
    );
  }

  const parsed = InvestigateRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json(
      {
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Invalid claim input.",
          details: parsed.error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  const claimText = parsed.data.claim;
  const normalized = normalizeClaim(claimText);

  // 3. Concurrency Lock: Reject Duplicate In-Flight Requests
  if (activeInFlightClaims.has(normalized)) {
    return Response.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "An identical claim investigation is already in flight. Please wait for it to complete.",
        },
      },
      { status: 429 }
    );
  }

  activeInFlightClaims.add(normalized);

  try {
    // 4. Honest Configuration Check
    const nvidiaCheck = validateNvidiaConfiguration();
    const tavilyCheck = validateTavilyConfiguration();
    const missingVars = [...nvidiaCheck.missingVars, ...tavilyCheck.missingVars];

    if (missingVars.length > 0) {
      return Response.json(
        {
          success: false,
          error: {
            code: "MISSING_CONFIG",
            message: `Service configuration incomplete. Missing required environment variables: ${missingVars.join(", ")}`,
            details: { missingVariables: missingVars },
          },
        },
        { status: 503 }
      );
    }

    // 5. Credit Protection & Budget Gate
    const isProduction = process.env.NODE_ENV === "production";
    const publicLiveEnabled = process.env.PUBLIC_LIVE_INVESTIGATION_ENABLED === "true";

    if (isProduction && !publicLiveEnabled) {
      return Response.json(
        {
          success: false,
          error: {
            code: "CREDIT_PROTECTION_LOCKED",
            message:
              "Live investigations are locked in public deployment to protect provider API credits. Explore the verified live archive, or configure DATABASE_URL and enable PUBLIC_LIVE_INVESTIGATION_ENABLED.",
          },
        },
        { status: 403 }
      );
    }

    if (isProduction && publicLiveEnabled) {
      // Enforce durable cross-instance daily budget (Fail-Closed)
      const durableBudget = await reserveDurableSearchBudget(2);
      if (!durableBudget.allowed) {
        return Response.json(
          {
            success: false,
            error: {
              code: "BUDGET_EXHAUSTED",
              message: durableBudget.error || "Durable search budget exhausted or unavailable (Fail-Closed).",
            },
          },
          { status: 429 }
        );
      }
    } else {
      // Local development & testing: in-memory budget check
      const budgetStatus = getTavilyBudgetStatus();
      if (budgetStatus.exhausted) {
        return Response.json(
          {
            success: false,
            error: {
              code: "BUDGET_EXHAUSTED",
              message: `Instance search budget reached (${budgetStatus.maxSearches} search limit). Further searches are locked.`,
              details: budgetStatus,
            },
          },
          { status: 429 }
        );
      }
    }

    // 6. Execute Real Investigation Pipeline
    const report = await runInvestigationPipeline({
      claimText,
      normalizedClaim: normalized,
    });

    return Response.json(
      {
        success: true,
        data: report,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof TavilyClientError) {
      if (err.code === "BUDGET_EXHAUSTED") {
        return Response.json(
          {
            success: false,
            error: {
              code: "BUDGET_EXHAUSTED",
              message: err.message,
            },
          },
          { status: 429 }
        );
      }
      if (err.code === "TIMEOUT") {
        return Response.json(
          {
            success: false,
            error: {
              code: "GATEWAY_TIMEOUT",
              message: "Search retrieval service timed out.",
            },
          },
          { status: 504 }
        );
      }
      return Response.json(
        {
          success: false,
          error: {
            code: "PROVIDER_ERROR",
            message: `Tavily Search error: ${err.message}`,
            details: { provider: "tavily", status: err.status },
          },
        },
        { status: err.status === 401 ? 401 : 502 }
      );
    }

    if (err instanceof NvidiaClientError) {
      if (err.code === "TIMEOUT") {
        return Response.json(
          {
            success: false,
            error: {
              code: "GATEWAY_TIMEOUT",
              message: "AI analysis service timed out.",
            },
          },
          { status: 504 }
        );
      }
      return Response.json(
        {
          success: false,
          error: {
            code: "PROVIDER_ERROR",
            message: `NVIDIA Nemotron API error: ${err.message}`,
            details: { provider: "nvidia", status: err.status },
          },
        },
        { status: err.status === 401 ? 401 : err.status === 404 ? 404 : 502 }
      );
    }

    return Response.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "An unexpected investigation error occurred.",
        },
      },
      { status: 500 }
    );
  } finally {
    activeInFlightClaims.delete(normalized);
  }
}

export function resetRateLimitsForTesting(): void {
  rateLimitMap.clear();
}

export function resetInFlightClaimsForTesting(): void {
  activeInFlightClaims.clear();
}

export function addInFlightClaimForTesting(normalized: string): void {
  activeInFlightClaims.add(normalized);
}
