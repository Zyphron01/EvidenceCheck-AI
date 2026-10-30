/**
 * Tavily Basic Search client (server-side only).
 * Never exposed to browser code.
 *
 * Enforces timeout, safe error handling, atomic in-memory usage budget limits,
 * and configuration validation without firing outbound calls.
 */

export interface TavilyConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxSearches: number;
}

export interface TavilySearchResultItem {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResultItem[];
}

export class TavilyClientError extends Error {
  readonly code: "CONFIG_ERROR" | "TIMEOUT" | "BUDGET_EXHAUSTED" | "PROVIDER_ERROR" | "NETWORK_ERROR";
  readonly status?: number;

  constructor(
    message: string,
    code: "CONFIG_ERROR" | "TIMEOUT" | "BUDGET_EXHAUSTED" | "PROVIDER_ERROR" | "NETWORK_ERROR",
    status?: number
  ) {
    super(message);
    this.name = "TavilyClientError";
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_TAVILY_BASE_URL = "https://api.tavily.com";
const DEFAULT_TAVILY_TIMEOUT_MS = 15000;
const DEFAULT_MAX_SEARCHES = 20;

// Per-instance in-memory search counter (resets on server restart / cold start)
let inMemorySearchCount = 0;

function parseMaxSearches(): number {
  if (process.env.TAVILY_MAX_SEARCHES !== undefined && process.env.TAVILY_MAX_SEARCHES.trim() !== "") {
    const parsed = parseInt(process.env.TAVILY_MAX_SEARCHES, 10);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return DEFAULT_MAX_SEARCHES;
}

export function getTavilyBudgetStatus(): {
  currentCount: number;
  maxSearches: number;
  remaining: number;
  exhausted: boolean;
} {
  const max = parseMaxSearches();

  return {
    currentCount: inMemorySearchCount,
    maxSearches: max,
    remaining: Math.max(0, max - inMemorySearchCount),
    exhausted: inMemorySearchCount >= max,
  };
}

/**
 * Atomically reserve a search budget slot.
 * Returns true if reservation succeeded, false if exhausted.
 * Mitigates TOCTOU race conditions across concurrent requests.
 */
export function reserveTavilySearchSlot(): boolean {
  const max = parseMaxSearches();

  if (inMemorySearchCount >= max) {
    return false;
  }
  inMemorySearchCount += 1;
  return true;
}

/**
 * Release a reserved search slot if an in-flight search fails before execution.
 */
export function releaseTavilySearchSlot(): void {
  if (inMemorySearchCount > 0) {
    inMemorySearchCount -= 1;
  }
}

/**
 * Reset counter (for isolated testing environments).
 */
export function resetTavilyBudgetForTesting(): void {
  inMemorySearchCount = 0;
}

export function validateTavilyConfiguration(): { valid: boolean; missingVars: string[] } {
  const missingVars: string[] = [];
  if (!process.env.TAVILY_API_KEY || process.env.TAVILY_API_KEY.trim() === "") {
    missingVars.push("TAVILY_API_KEY");
  }
  return {
    valid: missingVars.length === 0,
    missingVars,
  };
}

export function getTavilyConfig(): TavilyConfig {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new TavilyClientError(
      "Missing required server environment variable: TAVILY_API_KEY",
      "CONFIG_ERROR"
    );
  }

  const maxSearches = parseMaxSearches();

  return {
    apiKey: apiKey.trim(),
    baseUrl: process.env.TAVILY_BASE_URL?.trim() || DEFAULT_TAVILY_BASE_URL,
    timeoutMs: DEFAULT_TAVILY_TIMEOUT_MS,
    maxSearches,
  };
}

/**
 * Execute a basic search with Tavily.
 * Protected by atomic in-memory search budget, strict timeout, and safe error masking.
 * Note: Must NOT be called during Phase 1 setup without explicit user authorization.
 */
export async function searchTavily(
  query: string,
  searchDepth: "basic" | "advanced" = "basic"
): Promise<TavilySearchResponse> {
  const config = getTavilyConfig();

  // Atomic reservation to prevent concurrent overspending
  const slotAcquired = reserveTavilySearchSlot();
  if (!slotAcquired) {
    throw new TavilyClientError(
      `Tavily search budget exhausted for this instance (limit: ${config.maxSearches})`,
      "BUDGET_EXHAUSTED",
      429
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.baseUrl}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: config.apiKey,
        query,
        search_depth: searchDepth,
        include_answer: false,
        include_raw_content: false,
        max_results: 5,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Release slot since search was rejected by provider
      releaseTavilySearchSlot();
      throw new TavilyClientError(
        `Tavily API returned status ${response.status}`,
        "PROVIDER_ERROR",
        response.status
      );
    }

    const payload = (await response.json()) as TavilySearchResponse;

    return {
      query: payload.query || query,
      results: Array.isArray(payload.results)
        ? payload.results.map((item) => ({
            title: item.title || "Untitled",
            url: item.url || "",
            content: item.content || "",
            score: typeof item.score === "number" ? item.score : undefined,
            published_date: item.published_date,
          }))
        : [],
    };
  } catch (error: unknown) {
    releaseTavilySearchSlot();
    if (error instanceof TavilyClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new TavilyClientError("Tavily search request timed out", "TIMEOUT");
    }

    throw new TavilyClientError("Failed to communicate with Tavily search API", "NETWORK_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }
}
