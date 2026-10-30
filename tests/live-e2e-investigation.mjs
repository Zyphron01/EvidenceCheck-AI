/**
 * EvidenceCheck AI — Single Live End-to-End Investigation Runner
 *
 * Executes exactly ONE live investigation through the real handleInvestigateRequest endpoint.
 *
 * Claim: "The speed of light in a vacuum is approximately 299,792 kilometers per second."
 * Strictly bounded:
 * - Max 2 NVIDIA calls (planner + analyzer)
 * - Max 2 Tavily Basic Search calls (max 5 results each)
 * - No automatic retries
 * - No secret leaks
 */

import { handleInvestigateRequest } from "../src/lib/investigation/handler.ts";
import { getTavilyBudgetStatus } from "../src/lib/research/tavily.ts";
import { validateNvidiaConfiguration } from "../src/lib/ai/nvidia.ts";
import { validateTavilyConfiguration } from "../src/lib/research/tavily.ts";
import { EvidenceReportSchema } from "../src/lib/schemas/report.ts";
import * as fs from "node:fs";

async function runLiveInvestigation() {
  console.log("=== EVIDENCECHECK AI: FIRST LIVE END-TO-END INVESTIGATION ===");

  // 1. Pre-execution checks
  const nvidiaValidation = validateNvidiaConfiguration();
  const tavilyValidation = validateTavilyConfiguration();

  console.log("\n[Pre-execution Configuration Check]:");
  console.log(`  - NVIDIA Configured: ${nvidiaValidation.valid ? "YES" : "NO (Missing: " + nvidiaValidation.missingVars.join(", ") + ")"}`);
  console.log(`  - Tavily Configured: ${tavilyValidation.valid ? "YES" : "NO (Missing: " + tavilyValidation.missingVars.join(", ") + ")"}`);
  console.log(`  - Configured Model: ${process.env.NVIDIA_MODEL}`);

  const initialBudget = getTavilyBudgetStatus();
  console.log(`  - Tavily Initial Budget: ${initialBudget.currentCount} used / ${initialBudget.maxSearches} max (${initialBudget.remaining} remaining)`);

  if (!nvidiaValidation.valid || !tavilyValidation.valid) {
    console.error("Configuration incomplete. Aborting before execution.");
    process.exit(1);
  }

  if (initialBudget.remaining < 2) {
    console.error(`Insufficient budget (${initialBudget.remaining} remaining, need 2). Aborting.`);
    process.exit(1);
  }

  const claim = "The speed of light in a vacuum is approximately 299,792 kilometers per second.";
  console.log(`\n[Target Claim]: "${claim}"`);
  console.log("[Limits Enforced]: Max 2 NVIDIA calls, Max 2 Tavily searches, no retries.");

  const request = new Request("http://localhost:3000/api/investigate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify({ claim }),
  });

  const startTime = Date.now();
  console.log("\n[Dispatching investigation pipeline...]");

  let response;
  try {
    response = await handleInvestigateRequest(request);
  } catch (fatalError) {
    console.error("[Fatal Pipeline Error]:", fatalError);
    process.exit(1);
  }

  const durationMs = Date.now() - startTime;
  console.log(`\n=== PIPELINE RESPONSE RECEIVED (${durationMs}ms) ===`);
  console.log(`HTTP Status: ${response.status} ${response.statusText}`);

  const responseBody = await response.json();
  const finalBudget = getTavilyBudgetStatus();
  const searchesConsumed = finalBudget.currentCount - initialBudget.currentCount;

  console.log("\n[Execution Statistics]:");
  console.log(`  - HTTP Status Code: ${response.status}`);
  console.log(`  - Pipeline Success: ${responseBody.success ? "YES" : "NO"}`);
  console.log(`  - Tavily Searches Consumed: ${searchesConsumed}`);
  console.log(`  - Tavily Budget Remaining: ${finalBudget.remaining}`);

  if (!response.ok || !responseBody.success) {
    console.error("\n[Investigation Failed]:");
    console.error("Error Code:", responseBody?.error?.code);
    console.error("Error Message:", responseBody?.error?.message);
    console.error("Error Details:", JSON.stringify(responseBody?.error?.details || {}));
    process.exit(1);
  }

  const report = responseBody.data;

  // Save the full report for audit trail
  fs.writeFileSync(
    "tests/last-live-report.json",
    JSON.stringify(report, null, 2),
    "utf-8"
  );
  console.log("  - Full Report saved to: tests/last-live-report.json");

  // Validate against EvidenceReportSchema
  const schemaValidation = EvidenceReportSchema.safeParse(report);
  console.log(`  - EvidenceReportSchema Valid: ${schemaValidation.success ? "YES" : "NO"}`);

  // Inspect Sources
  console.log(`\n[Sources Retained]: ${report.sources.length} unique sources`);
  for (let i = 0; i < report.sources.length; i++) {
    const s = report.sources[i];
    console.log(`  [Source ${i + 1}] (${s.id}) [${s.targetedStance}] "${s.title}"`);
    console.log(`      Domain: ${s.domain} | URL: ${s.url}`);
  }

  // Inspect Passages
  console.log(`\n[Passages Segmented]: ${report.passages.length} passages`);
  const supportingPassages = report.passages.filter((p) => p.stance === "SUPPORTING");
  const contradictingPassages = report.passages.filter((p) => p.stance === "CONTRADICTING");
  const neutralPassages = report.passages.filter((p) => p.stance === "NEUTRAL");
  console.log(`  - Supporting: ${supportingPassages.length}`);
  console.log(`  - Contradicting: ${contradictingPassages.length}`);
  console.log(`  - Neutral: ${neutralPassages.length}`);

  // Inspect Citations
  console.log(`\n[Citation Audit]: ${report.citations.length} total citations`);
  const verifiedCitations = report.citations.filter((c) => c.validationStatus === "VERIFIED");
  const failedCitations = report.citations.filter((c) => c.validationStatus === "FAILED");
  const unverifiedCitations = report.citations.filter((c) => c.validationStatus === "UNVERIFIED");
  console.log(`  - Verified Citations: ${verifiedCitations.length}`);
  console.log(`  - Failed Citations: ${failedCitations.length}`);
  console.log(`  - Unverified Citations: ${unverifiedCitations.length}`);

  for (let i = 0; i < report.citations.length; i++) {
    const c = report.citations[i];
    console.log(`  [Citation ${i + 1}] [${c.validationStatus}] passage=${c.passageId}`);
    console.log(`      Sentence: "${c.sentence}"`);
    if (c.exactQuote) {
      console.log(`      Quote: "${c.exactQuote}"`);
    }
    if (c.auditFailureReason) {
      console.log(`      Failure Reason: ${c.auditFailureReason}`);
    }
  }

  // Inspect Contradictions
  console.log(`\n[Contradictions Detected]: ${report.contradictions.length}`);
  for (const con of report.contradictions) {
    console.log(`  - [${con.severity}] ${con.description}`);
  }

  // Inspect Verdict
  console.log("\n[Final Verdict Summary]:");
  console.log(`  - Status: ${report.verdict.status}`);
  console.log(`  - Confidence Support Index: ${report.verdict.confidence}`);
  console.log(`  - Summary: ${report.verdict.summary}`);
  console.log(`  - Reasoning: ${report.verdict.reasoning}`);

  console.log("\n=== FIRST LIVE END-TO-END INVESTIGATION COMPLETE ===");
}

runLiveInvestigation().catch((err) => {
  console.error("Unhandled fatal exception:", err);
  process.exit(1);
});
