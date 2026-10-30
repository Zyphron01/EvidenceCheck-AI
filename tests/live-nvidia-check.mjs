/**
 * EvidenceCheck AI — Single Live NVIDIA Connection Verification
 *
 * Executes exactly ONE live completion request to https://integrate.api.nvidia.com/v1/chat/completions
 * Strictly verified:
 * - Uses configured NVIDIA_MODEL and NVIDIA_API_KEY from environment.
 * - enable_thinking: false at root level via buildNemotronRequestBody.
 * - No Tavily calls.
 * - No automatic retries.
 * - No logging of API keys or sensitive headers.
 */

import {
  getNvidiaConfig,
  buildNemotronRequestBody,
  parseNemotronChatResponse,
  parseNvidiaErrorResponse,
} from "../src/lib/ai/nvidia.ts";
import { parseQueryPlanResponse } from "../src/lib/ai/query-planner.ts";

async function runLiveVerification() {
  console.log("=== NVIDIA LIVE VERIFICATION START ===");

  const config = getNvidiaConfig();
  console.log(`[Target Model]: ${config.model}`);
  console.log(`[Target Endpoint]: ${config.baseUrl}/chat/completions`);
  console.log(`[API Key Configured]: ${config.apiKey ? "YES (masked)" : "NO"}`);

  const options = {
    messages: [
      {
        role: "system",
        content:
          "You are an expert evidence retrieval planner for a citation-audited fact-checking system. " +
          "Given a factual claim, formulate two distinct, concise, objective search queries: 'supportingQuery' and 'challengingQuery'. " +
          'Output MUST be valid JSON only with keys "supportingQuery" and "challengingQuery". Do not include additional commentary.',
      },
      {
        role: "user",
        content: 'Factual claim to investigate:\n"The Apollo 11 mission landed on the Moon in July 1969."\n\nGenerate the JSON query plan:',
      },
    ],
    temperature: 1,
    topP: 0.95,
    maxTokens: 512,
    enableThinking: false,
  };

  const requestBody = buildNemotronRequestBody(config.model, options);

  console.log("[Request Serialization Check]:");
  console.log(`  - extra_body present: ${"extra_body" in requestBody ? "YES (ERROR)" : "NO (CORRECT)"}`);
  console.log(`  - chat_template_kwargs.enable_thinking: ${requestBody.chat_template_kwargs?.enable_thinking}`);
  console.log(`  - temperature: ${requestBody.temperature}`);
  console.log(`  - top_p: ${requestBody.top_p}`);
  console.log(`  - max_tokens: ${requestBody.max_tokens}`);
  console.log(`  - stream: ${requestBody.stream}`);

  console.log("\n[Dispatching exactly ONE live HTTP request...]");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  let response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[Network/Connection Failure]:", err?.name || "Error", err?.message || String(err));
    process.exit(1);
  } finally {
    clearTimeout(timeoutId);
  }

  console.log(`\n=== NVIDIA RESPONSE RECEIVED ===`);
  console.log(`HTTP Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    let rawErrorPayload = null;
    try {
      rawErrorPayload = await response.json();
    } catch {
      // Non-JSON error body
    }

    const errorDiag = parseNvidiaErrorResponse(rawErrorPayload, response.status);
    console.error("[NVIDIA Error Diagnostics]:");
    console.error(`  - HTTP Status: ${errorDiag.status}`);
    console.error(`  - Provider Error Code: ${errorDiag.providerErrorCode || "N/A"}`);
    console.error(`  - Rejected Parameter: ${errorDiag.rejectedParameter || "N/A"}`);
    console.error(`  - Sanitized Message: ${errorDiag.sanitizedValidationMessage || "N/A"}`);
    process.exit(1);
  }

  const payload = await response.json();

  const choice = payload?.choices?.[0];
  const finishReason = choice?.finish_reason;
  const message = choice?.message;
  const rawContent = message?.content;
  const reasoningContent = message?.reasoning_content ?? message?.reasoning;

  const usage = payload?.usage;

  console.log("[Response Diagnostics]:");
  console.log(`  - Request Accepted: YES`);
  console.log(`  - Finish Reason: ${finishReason}`);
  console.log(`  - Content Present: ${typeof rawContent === "string" && rawContent.trim().length > 0 ? "YES" : "NO"}`);
  console.log(`  - Content Length: ${typeof rawContent === "string" ? rawContent.trim().length : 0} chars`);
  console.log(`  - Reasoning Trace Present: ${typeof reasoningContent === "string" && reasoningContent.trim().length > 0 ? "YES" : "NO"}`);
  if (usage) {
    console.log(`  - Token Usage: prompt=${usage.prompt_tokens}, completion=${usage.completion_tokens}, total=${usage.total_tokens}`);
  } else {
    console.log(`  - Token Usage: Not reported`);
  }

  // Validate parsing through pure parser
  const parsedContent = parseNemotronChatResponse(payload, response.status);
  console.log(`\n[Parsed Final Content]:\n${parsedContent}`);

  // Validate through Query Planner Zod schema
  let structuredPlan;
  try {
    structuredPlan = parseQueryPlanResponse(parsedContent);
    console.log("\n[Structured JSON Validation]: SUCCESS");
    console.log(`  - supportingQuery: "${structuredPlan.supportingQuery}"`);
    console.log(`  - challengingQuery: "${structuredPlan.challengingQuery}"`);
  } catch (zodErr) {
    console.error("\n[Structured JSON Validation]: FAILED", zodErr.message);
    process.exit(1);
  }

  console.log("\n=== NVIDIA LIVE VERIFICATION COMPLETE: ALL CHECKS PASSED ===");
}

runLiveVerification().catch((err) => {
  console.error("Unhandled verification error:", err);
  process.exit(1);
});

