/**
 * NVIDIA Nemotron client (server-side OpenAI-compatible API).
 * Never exposed to browser code.
 *
 * Enforces timeout, safe error handling, non-streaming mode, thinking-toggle controls,
 * and validates choices[0].finish_reason and choices[0].message.content.
 */

export interface NvidiaConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
}

export interface NvidiaChatCompletionOptions {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  enableThinking?: boolean;
}

export interface SafeNvidiaDiagnostics {
  status: number;
  finishReason?: string;
  hasContent: boolean;
  hasReasoning: boolean;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface SafeNvidiaErrorDiagnostics {
  status: number;
  providerErrorCode?: string;
  sanitizedValidationMessage?: string;
  rejectedParameter?: string;
}

export class NvidiaClientError extends Error {
  readonly code: "CONFIG_ERROR" | "TIMEOUT" | "PROVIDER_ERROR" | "NETWORK_ERROR";
  readonly status?: number;
  readonly diagnostics?: SafeNvidiaDiagnostics | SafeNvidiaErrorDiagnostics;

  constructor(
    message: string,
    code: "CONFIG_ERROR" | "TIMEOUT" | "PROVIDER_ERROR" | "NETWORK_ERROR",
    status?: number,
    diagnostics?: SafeNvidiaDiagnostics | SafeNvidiaErrorDiagnostics
  ) {
    super(message);
    this.name = "NvidiaClientError";
    this.code = code;
    this.status = status;
    this.diagnostics = diagnostics;
  }
}

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_TIMEOUT_MS = 30000;

export function getNvidiaConfig(): NvidiaConfig {
  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_MODEL;

  if (!apiKey || apiKey.trim() === "") {
    throw new NvidiaClientError(
      "Missing required server environment variable: NVIDIA_API_KEY",
      "CONFIG_ERROR"
    );
  }

  if (!model || model.trim() === "") {
    throw new NvidiaClientError(
      "Missing required server environment variable: NVIDIA_MODEL (Nemotron model ID must be explicitly configured)",
      "CONFIG_ERROR"
    );
  }

  return {
    apiKey: apiKey.trim(),
    model: model.trim(),
    baseUrl: process.env.NVIDIA_BASE_URL?.trim() || DEFAULT_BASE_URL,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

export function validateNvidiaConfiguration(): { valid: boolean; missingVars: string[] } {
  const missingVars: string[] = [];
  if (!process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY.trim() === "") {
    missingVars.push("NVIDIA_API_KEY");
  }
  if (!process.env.NVIDIA_MODEL || process.env.NVIDIA_MODEL.trim() === "") {
    missingVars.push("NVIDIA_MODEL");
  }
  return {
    valid: missingVars.length === 0,
    missingVars,
  };
}

/**
 * Pure function to construct a well-formed JSON request payload for direct HTTP fetch.
 * Explicitly:
 * - Serializes chat_template_kwargs once at root level.
 * - Does NOT include extra_body wrapper in raw HTTP JSON.
 * - Enforces model, temperature (default 1), top_p (default 0.95), stream: false.
 */
export function buildNemotronRequestBody(
  model: string,
  options: NvidiaChatCompletionOptions
): Record<string, unknown> {
  const enableThinking = options.enableThinking ?? false;

  return {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 1,
    top_p: options.topP ?? 0.95,
    max_tokens: options.maxTokens ?? 2048,
    stream: false,
    chat_template_kwargs: {
      enable_thinking: enableThinking,
    },
  };
}

/**
 * Pure function to parse NVIDIA HTTP 4xx/5xx error responses into safe, allowlisted diagnostics.
 * Captures only: status, provider error type/code, short sanitized validation message,
 * and rejected parameter name. Never leaks API keys, prompts, or sensitive text.
 */
export function parseNvidiaErrorResponse(
  errorPayload: unknown,
  status: number
): SafeNvidiaErrorDiagnostics {
  let providerErrorCode: string | undefined;
  let sanitizedValidationMessage: string | undefined;
  let rejectedParameter: string | undefined;

  if (errorPayload && typeof errorPayload === "object") {
    const obj = errorPayload as Record<string, unknown>;

    // Format A (OpenAI error format: { error: { message, type, param, code } })
    if (obj.error && typeof obj.error === "object") {
      const err = obj.error as Record<string, unknown>;
      if (typeof err.type === "string") {
        providerErrorCode = err.type.slice(0, 60);
      } else if (typeof err.code === "string" || typeof err.code === "number") {
        providerErrorCode = String(err.code).slice(0, 60);
      }

      if (typeof err.param === "string") {
        rejectedParameter = err.param.slice(0, 60);
      }

      if (typeof err.message === "string") {
        sanitizedValidationMessage = err.message
          .slice(0, 150)
          .replace(/[^\w\s.,:;()_-]/g, "")
          .trim();
      }
    }
    // Format B (FastAPI / Pydantic format: { detail: [ { loc, msg, type } ] })
    else if (Array.isArray(obj.detail) && obj.detail.length > 0) {
      const firstDetail = obj.detail[0] as Record<string, unknown>;
      if (typeof firstDetail.type === "string") {
        providerErrorCode = firstDetail.type.slice(0, 60);
      }
      if (Array.isArray(firstDetail.loc) && firstDetail.loc.length > 0) {
        rejectedParameter = String(firstDetail.loc[firstDetail.loc.length - 1]).slice(0, 60);
      }
      if (typeof firstDetail.msg === "string") {
        sanitizedValidationMessage = firstDetail.msg
          .slice(0, 150)
          .replace(/[^\w\s.,:;()_-]/g, "")
          .trim();
      }
    }
    // Format C (Simple detail string: { detail: "message" })
    else if (typeof obj.detail === "string") {
      sanitizedValidationMessage = obj.detail
        .slice(0, 150)
        .replace(/[^\w\s.,:;()_-]/g, "")
        .trim();
    }
  }

  return {
    status,
    providerErrorCode,
    sanitizedValidationMessage,
    rejectedParameter,
  };
}

/**
 * Pure function to safely parse and validate non-streaming Nemotron chat completions.
 * Enforces validation of finish_reason, message.content, and guards against empty
 * output or using reasoning_content as a substitute final answer.
 */
export function parseNemotronChatResponse(payload: unknown, httpStatus: number = 200): string {
  if (!payload || typeof payload !== "object") {
    const diag: SafeNvidiaDiagnostics = {
      status: httpStatus,
      hasContent: false,
      hasReasoning: false,
    };
    console.error("[NVIDIA Safe Diagnostics]", JSON.stringify(diag));
    throw new NvidiaClientError(
      "NVIDIA API response format unexpected: payload is not a valid JSON object",
      "PROVIDER_ERROR",
      httpStatus,
      diag
    );
  }

  const rawObj = payload as Record<string, unknown>;
  const choices = rawObj.choices;

  const usage = rawObj.usage as Record<string, unknown> | undefined;
  const promptTokens = typeof usage?.prompt_tokens === "number" ? usage.prompt_tokens : undefined;
  const completionTokens =
    typeof usage?.completion_tokens === "number" ? usage.completion_tokens : undefined;
  const totalTokens = typeof usage?.total_tokens === "number" ? usage.total_tokens : undefined;

  if (!Array.isArray(choices) || choices.length === 0) {
    const diag: SafeNvidiaDiagnostics = {
      status: httpStatus,
      hasContent: false,
      hasReasoning: false,
      promptTokens,
      completionTokens,
      totalTokens,
    };
    console.error("[NVIDIA Safe Diagnostics]", JSON.stringify(diag));
    throw new NvidiaClientError(
      "NVIDIA API response format unexpected: choices array is empty or missing",
      "PROVIDER_ERROR",
      httpStatus,
      diag
    );
  }

  const firstChoice = choices[0] as Record<string, unknown> | undefined;
  const finishReason = typeof firstChoice?.finish_reason === "string" ? firstChoice.finish_reason : undefined;
  const message = firstChoice?.message as Record<string, unknown> | undefined;

  const rawContent = message?.content;
  const reasoningContent = message?.reasoning_content ?? message?.reasoning;

  const hasContent = typeof rawContent === "string" && rawContent.trim().length > 0;
  const hasReasoning =
    typeof reasoningContent === "string" && reasoningContent.trim().length > 0;

  const safeDiag: SafeNvidiaDiagnostics = {
    status: httpStatus,
    finishReason,
    hasContent,
    hasReasoning,
    promptTokens,
    completionTokens,
    totalTokens,
  };

  // 1. Handle token budget exhaustion / length truncation
  if (finishReason === "length") {
    console.error("[NVIDIA Safe Diagnostics]", JSON.stringify(safeDiag));
    if (!hasContent) {
      throw new NvidiaClientError(
        "NVIDIA API output budget exhausted during reasoning before final content could be generated (finish_reason: length).",
        "PROVIDER_ERROR",
        httpStatus,
        safeDiag
      );
    }
    throw new NvidiaClientError(
      "NVIDIA API response truncated due to output token limit (finish_reason: length).",
      "PROVIDER_ERROR",
      httpStatus,
      safeDiag
    );
  }

  // 2. Reject empty content — do NOT substitute reasoning_content as final answer
  if (!hasContent) {
    console.error("[NVIDIA Safe Diagnostics]", JSON.stringify(safeDiag));
    if (hasReasoning) {
      throw new NvidiaClientError(
        "NVIDIA API returned reasoning trace without final message content.",
        "PROVIDER_ERROR",
        httpStatus,
        safeDiag
      );
    }
    throw new NvidiaClientError(
      "NVIDIA API response format unexpected: message content is empty or null.",
      "PROVIDER_ERROR",
      httpStatus,
      safeDiag
    );
  }

  return (rawContent as string).trim();
}

/**
 * Execute chat completion with timeout, safe error masking, non-streaming mode,
 * and direct fetch body serialization.
 */
export async function createNemotronCompletion(
  options: NvidiaChatCompletionOptions
): Promise<string> {
  const config = getNvidiaConfig();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  const requestBody = buildNemotronRequestBody(config.model, options);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      let rawErrorPayload: unknown;
      try {
        rawErrorPayload = await response.json();
      } catch {
        // Response was not JSON
      }

      const errorDiag = parseNvidiaErrorResponse(rawErrorPayload, response.status);
      console.error("[NVIDIA Safe Diagnostics] Non-200 HTTP response:", JSON.stringify(errorDiag));

      let errorMessage = `NVIDIA API returned error status ${response.status}`;
      if (errorDiag.sanitizedValidationMessage) {
        errorMessage += `: ${errorDiag.sanitizedValidationMessage}`;
      }
      if (errorDiag.rejectedParameter) {
        errorMessage += ` (parameter: ${errorDiag.rejectedParameter})`;
      }

      throw new NvidiaClientError(
        errorMessage,
        "PROVIDER_ERROR",
        response.status,
        errorDiag
      );
    }

    const payload = await response.json();
    return parseNemotronChatResponse(payload, response.status);
  } catch (error: unknown) {
    if (error instanceof NvidiaClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new NvidiaClientError("NVIDIA API request timed out", "TIMEOUT");
    }

    throw new NvidiaClientError("Failed to communicate with NVIDIA API", "NETWORK_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }
}
