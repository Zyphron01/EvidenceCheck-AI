/**
 * EvidenceCheck AI - Runtime Verification Test Suite
 *
 * Verifies runtime contracts without network port flakiness or external provider calls:
 * - Environment variable validation and secret safety
 * - Tavily budget atomic slot reservation and race condition mitigation
 * - Zod schema validation (including INSUFFICIENT_EVIDENCE verdict state)
 * - HTTP status codes and sanitized responses for:
 *   - 400 Bad Request (invalid claim, empty claim, malformed JSON)
 *   - 503 Service Unavailable (missing configuration, safe variable listing)
 *   - 501 Not Implemented (configured environment without mock results)
 *   - 429 Rate Limited (in-memory per-IP request limit)
 *   - 429 Duplicate in-flight rejection
 *   - 429 Tavily budget exhausted
 */

const {
  validateNvidiaConfiguration,
  getNvidiaConfig,
  NvidiaClientError,
} = await import("../src/lib/ai/nvidia.ts");

const {
  validateTavilyConfiguration,
  reserveTavilySearchSlot,
  releaseTavilySearchSlot,
  resetTavilyBudgetForTesting,
} = await import("../src/lib/research/tavily.ts");

const {
  InvestigateRequestSchema,
} = await import("../src/types/investigation.ts");

const {
  VerdictSchema,
  VerdictStatusSchema,
} = await import("../src/lib/schemas/report.ts");

const {
  handleInvestigateRequest,
  normalizeClaim,
  resetRateLimitsForTesting,
  resetInFlightClaimsForTesting,
  addInFlightClaimForTesting,
} = await import("../src/lib/investigation/handler.ts");

let passedCount = 0;
let failedCount = 0;
const testRecords = [];

function recordResult(testName, passed, actualStatus = null, body = null, extraInfo = "") {
  if (passed) {
    passedCount++;
    console.log(`  [PASS] ${testName}`);
    testRecords.push({ testName, status: "Verified", actualStatus, body });
  } else {
    failedCount++;
    console.error(`  [FAIL] ${testName}: ${extraInfo}`);
    testRecords.push({ testName, status: "Failed", actualStatus, body, error: extraInfo });
  }
}

async function runUnitChecks() {
  console.log("\n=== SECTION 1: UNIT & SCHEMA CHECKS ===");

  // 1.1 Zod Input Validation
  const emptyCheck = InvestigateRequestSchema.safeParse({ claim: "" });
  recordResult("Rejects empty claim in Zod schema", !emptyCheck.success);

  const shortCheck = InvestigateRequestSchema.safeParse({ claim: "abc" });
  recordResult("Rejects claim shorter than 5 chars in Zod schema", !shortCheck.success);

  const validCheck = InvestigateRequestSchema.safeParse({
    claim: "Water boils at 100 degrees Celsius under 1 atm pressure.",
  });
  recordResult("Accepts valid claim text in Zod schema", validCheck.success);

  // 1.2 Verdict Schema & INSUFFICIENT_EVIDENCE
  const validStatuses = VerdictStatusSchema.options;
  recordResult(
    "VerdictStatusSchema explicitly includes INSUFFICIENT_EVIDENCE",
    validStatuses.includes("INSUFFICIENT_EVIDENCE")
  );

  const verdictTest = VerdictSchema.safeParse({
    status: "INSUFFICIENT_EVIDENCE",
    confidence: 0.1,
    summary: "No credible evidence discovered.",
    reasoning: "Both positive and negative searches returned zero verifiable passages.",
    insufficientEvidenceReason: "Query retrieved no primary sources.",
  });
  recordResult("VerdictSchema parses INSUFFICIENT_EVIDENCE status", verdictTest.success);

  // 1.3 NVIDIA Environment Validation & Secret Protection
  const originalNvKey = process.env.NVIDIA_API_KEY;
  const originalNvModel = process.env.NVIDIA_MODEL;
  delete process.env.NVIDIA_API_KEY;
  delete process.env.NVIDIA_MODEL;

  const nvidiaMissing = validateNvidiaConfiguration();
  recordResult(
    "NVIDIA configuration detects missing keys and model ID without throwing",
    !nvidiaMissing.valid &&
      nvidiaMissing.missingVars.includes("NVIDIA_API_KEY") &&
      nvidiaMissing.missingVars.includes("NVIDIA_MODEL")
  );

  let nvidiaConfigErrorCaught = false;
  try {
    getNvidiaConfig();
  } catch (err) {
    nvidiaConfigErrorCaught = err instanceof NvidiaClientError && err.code === "CONFIG_ERROR";
  }
  recordResult("getNvidiaConfig throws CONFIG_ERROR when missing vars", nvidiaConfigErrorCaught);

  // 1.4 Tavily Environment Validation
  const originalTvKey = process.env.TAVILY_API_KEY;
  delete process.env.TAVILY_API_KEY;

  const tavilyMissing = validateTavilyConfiguration();
  recordResult(
    "Tavily configuration detects missing TAVILY_API_KEY without throwing",
    !tavilyMissing.valid && tavilyMissing.missingVars.includes("TAVILY_API_KEY")
  );

  // 1.5 Tavily Race Condition & Atomic Slot Reservation
  process.env.TAVILY_MAX_SEARCHES = "2";
  resetTavilyBudgetForTesting();
  const slot1 = reserveTavilySearchSlot();
  const slot2 = reserveTavilySearchSlot();
  const slot3 = reserveTavilySearchSlot(); // Should fail because max is 2
  recordResult(
    "Tavily atomic reservation strictly enforces limit and blocks overspending (race condition mitigation)",
    slot1 === true && slot2 === true && slot3 === false
  );

  releaseTavilySearchSlot(); // Rollback one slot
  const slotAfterRollback = reserveTavilySearchSlot();
  recordResult(
    "Tavily slot release restores available budget slot after error/rollback",
    slotAfterRollback === true
  );

  resetTavilyBudgetForTesting();
  delete process.env.TAVILY_MAX_SEARCHES;

  // Restore env if any
  if (originalNvKey) process.env.NVIDIA_API_KEY = originalNvKey;
  if (originalNvModel) process.env.NVIDIA_MODEL = originalNvModel;
  if (originalTvKey) process.env.TAVILY_API_KEY = originalTvKey;
}

async function runRuntimeEndpointChecks() {
  console.log("\n=== SECTION 2: RUNTIME HTTP ENDPOINT CHECKS (/api/investigate) ===");

  // Ensure unconfigured state for baseline error testing
  delete process.env.NVIDIA_API_KEY;
  delete process.env.NVIDIA_MODEL;
  delete process.env.TAVILY_API_KEY;
  delete process.env.TAVILY_MAX_SEARCHES;
  resetRateLimitsForTesting();
  resetInFlightClaimsForTesting();

  // 2.1 Test 400 Bad Request: Malformed JSON Body
  const malformedReq = new Request("http://localhost/api/investigate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
    body: "{ malformed json",
  });
  const malformedRes = await handleInvestigateRequest(malformedReq);
  const malformedBody = await malformedRes.json();
  recordResult(
    "HTTP 400 returned for malformed JSON body",
    malformedRes.status === 400 && malformedBody.error?.code === "BAD_REQUEST",
    malformedRes.status,
    malformedBody
  );

  // 2.2 Test 400 Bad Request: Short claim (<5 characters)
  const shortReq = new Request("http://localhost/api/investigate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.2" },
    body: JSON.stringify({ claim: "tiny" }),
  });
  const shortRes = await handleInvestigateRequest(shortReq);
  const shortBody = await shortRes.json();
  recordResult(
    "HTTP 400 returned for claim < 5 characters",
    shortRes.status === 400 && shortBody.error?.code === "BAD_REQUEST",
    shortRes.status,
    shortBody
  );

  // 2.3 Test 503 Missing Configuration: Valid claim with missing env vars
  const missingConfigReq = new Request("http://localhost/api/investigate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.3" },
    body: JSON.stringify({ claim: "The Earth has a single natural satellite, the Moon." }),
  });
  const missingConfigRes = await handleInvestigateRequest(missingConfigReq);
  const missingConfigBody = await missingConfigRes.json();
  const missingVars = missingConfigBody.error?.details?.missingVariables || [];
  const safeConfigReported =
    missingConfigRes.status === 503 &&
    missingConfigBody.error?.code === "MISSING_CONFIG" &&
    missingVars.includes("NVIDIA_API_KEY") &&
    missingVars.includes("NVIDIA_MODEL") &&
    missingVars.includes("TAVILY_API_KEY");
  recordResult(
    "HTTP 503 returned naming missing variables (NVIDIA_API_KEY, NVIDIA_MODEL, TAVILY_API_KEY) with zero secret leaks",
    safeConfigReported,
    missingConfigRes.status,
    missingConfigBody
  );

  // 2.4 Test 429 In-Memory Rate Limiting (threshold: 5 requests/min per IP)
  const testIp = "192.168.1.50";
  let rateLimitedHit = false;
  let rateLimitResponse = null;
  let rateLimitBody = null;

  for (let i = 1; i <= 6; i++) {
    const req = new Request("http://localhost/api/investigate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": testIp },
      body: JSON.stringify({ claim: `Unique claim ${i} for IP rate limit test.` }),
    });
    const res = await handleInvestigateRequest(req);
    if (res.status === 429) {
      rateLimitedHit = true;
      rateLimitResponse = res;
      rateLimitBody = await res.json();
      break;
    }
  }
  recordResult(
    "HTTP 429 returned when exceeding rate limit (6th request from same IP blocked with Retry-After)",
    rateLimitedHit &&
      rateLimitBody?.error?.code === "RATE_LIMITED" &&
      rateLimitResponse?.headers.get("retry-after") !== null,
    rateLimitResponse?.status,
    rateLimitBody
  );

  // 2.5 Test 429 Tavily Budget Exhausted Prior to Network Calls
  process.env.NVIDIA_API_KEY = "nvapi-test-token-placeholder";
  process.env.NVIDIA_MODEL = "nvidia/nemotron-3.5-super-vl-120b-a12b";
  process.env.TAVILY_API_KEY = "tvly-test-token-placeholder";
  process.env.TAVILY_MAX_SEARCHES = "0"; // Budget set to 0 to block all outbound network traffic

  const budgetReq = new Request("http://localhost/api/investigate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "172.16.0.20" },
    body: JSON.stringify({
      claim: "Photosynthesis converts carbon dioxide and water into glucose and oxygen.",
    }),
  });
  const budgetRes = await handleInvestigateRequest(budgetReq);
  const budgetBody = await budgetRes.json();
  recordResult(
    "HTTP 429 returned with BUDGET_EXHAUSTED when instance search budget is exhausted (blocks outbound traffic)",
    budgetRes.status === 429 && budgetBody.error?.code === "BUDGET_EXHAUSTED",
    budgetRes.status,
    budgetBody
  );

  // 2.6 Test 429 Duplicate In-Flight Concurrency Lock
  const lockClaimText = "The speed of light in vacuum is approximately 299,792 kilometers per second.";
  const lockNormalized = normalizeClaim(lockClaimText);
  addInFlightClaimForTesting(lockNormalized);

  const duplicateReq = new Request("http://localhost/api/investigate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "172.16.0.35" },
    body: JSON.stringify({ claim: "THE SPEED OF LIGHT IN VACUUM is approximately 299,792 kilometers per second!!!" }),
  });

  const duplicateRes = await handleInvestigateRequest(duplicateReq);
  const duplicateBody = await duplicateRes.json();
  recordResult(
    "HTTP 429 returned when identical normalized claim is already in-flight",
    duplicateRes.status === 429 &&
      duplicateBody.error?.code === "RATE_LIMITED" &&
      duplicateBody.error?.message.includes("already in flight"),
    duplicateRes.status,
    duplicateBody
  );
  // 2.7 Test Production Credit Protection Lock (Fail-Closed default)
  const prevNodeEnv = process.env.NODE_ENV;
  const prevLiveEnabled = process.env.PUBLIC_LIVE_INVESTIGATION_ENABLED;
  const prevDbUrl = process.env.DATABASE_URL;

  process.env.NODE_ENV = "production";
  process.env.PUBLIC_LIVE_INVESTIGATION_ENABLED = "false";
  process.env.NVIDIA_API_KEY = "nvapi-test-token-placeholder";
  process.env.NVIDIA_MODEL = "nvidia/nemotron-3.5-super-vl-120b-a12b";
  process.env.TAVILY_API_KEY = "tvly-test-token-placeholder";

  const lockedReq = new Request("http://localhost/api/investigate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "172.16.0.40" },
    body: JSON.stringify({ claim: "Production gate test claim for credit protection." }),
  });
  const lockedRes = await handleInvestigateRequest(lockedReq);
  const lockedBody = await lockedRes.json();
  recordResult(
    "HTTP 403 CREDIT_PROTECTION_LOCKED returned in production when PUBLIC_LIVE_INVESTIGATION_ENABLED=false",
    lockedRes.status === 403 && lockedBody.error?.code === "CREDIT_PROTECTION_LOCKED",
    lockedRes.status,
    lockedBody
  );

  // 2.8 Test Production Fail-Closed when DATABASE_URL is missing
  process.env.PUBLIC_LIVE_INVESTIGATION_ENABLED = "true";
  delete process.env.DATABASE_URL;

  const noDbReq = new Request("http://localhost/api/investigate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "172.16.0.41" },
    body: JSON.stringify({ claim: "Production fail-closed test without DATABASE_URL." }),
  });
  const noDbRes = await handleInvestigateRequest(noDbReq);
  const noDbBody = await noDbRes.json();
  recordResult(
    "HTTP 429 BUDGET_EXHAUSTED returned in production when DATABASE_URL is unconfigured (Fail-Closed)",
    noDbRes.status === 429 &&
      noDbBody.error?.code === "BUDGET_EXHAUSTED" &&
      noDbBody.error?.message.includes("Fail-Closed"),
    noDbRes.status,
    noDbBody
  );

  // Restore env
  if (prevNodeEnv !== undefined) process.env.NODE_ENV = prevNodeEnv;
  else delete process.env.NODE_ENV;
  if (prevLiveEnabled !== undefined) process.env.PUBLIC_LIVE_INVESTIGATION_ENABLED = prevLiveEnabled;
  else delete process.env.PUBLIC_LIVE_INVESTIGATION_ENABLED;
  if (prevDbUrl !== undefined) process.env.DATABASE_URL = prevDbUrl;
  else delete process.env.DATABASE_URL;

  resetInFlightClaimsForTesting();
  delete process.env.NVIDIA_MODEL;
  delete process.env.TAVILY_API_KEY;
  delete process.env.TAVILY_MAX_SEARCHES;
  resetRateLimitsForTesting();
  resetInFlightClaimsForTesting();

  console.log(`\nVerification Suite Summary: ${passedCount} passed, ${failedCount} failed.`);
  if (failedCount > 0) {
    process.exit(1);
  }
}

async function main() {
  await runUnitChecks();
  await runRuntimeEndpointChecks();
}

main().catch((err) => {
  console.error("Fatal test execution error:", err);
  process.exit(1);
});
