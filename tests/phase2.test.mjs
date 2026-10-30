/**
 * EvidenceCheck AI — Phase 2 Deterministic Test Suite
 *
 * Verifies pure functions, schemas, query planner parsing, retrieval deduplication,
 * passage segmentation, analyzer parsing, citation auditing, and verdict computation.
 * STRICTLY DETERMINISTIC: Does NOT invoke live external NVIDIA or Tavily APIs.
 */

// 0. NVIDIA Nemotron Parser & Diagnostics
const {
  parseNemotronChatResponse,
  buildNemotronRequestBody,
  parseNvidiaErrorResponse,
  NvidiaClientError,
} = await import("../src/lib/ai/nvidia.ts");

// 1. Query Planner
const {
  parseQueryPlanResponse,
} = await import("../src/lib/ai/query-planner.ts");

// 2. Retrieval & Deduplication
const {
  normalizeSourceUrl,
  deduplicateSearchResults,
} = await import("../src/lib/research/retrieval.ts");

// 3. Passage Processor
const {
  extractDomain,
  segmentContentIntoPassages,
  processRetrievedSources,
} = await import("../src/lib/research/passages.ts");

// 4. Nemotron Analyzer
const {
  parseAnalyzerResponse,
  buildAnalyzerPrompt,
  applyPassageClassifications,
} = await import("../src/lib/ai/analyzer.ts");

// 5. Citation Auditor
const {
  verifyQuoteInPassage,
  auditCitations,
} = await import("../src/lib/verification/citations.ts");

// 6. Verdict Engine
const {
  computeVerdict,
} = await import("../src/lib/verification/verdict.ts");

let passed = 0;
let failed = 0;

function assert(condition, message, details = "") {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}: ${details}`);
  }
}

console.log("\n=== PHASE 2: MODULE 1 — QUERY PLANNER ===");

// 1.1 Valid Query Plan JSON
const validPlanJson = JSON.stringify({
  supportingQuery: "evidence for global sea level rise measurements NASA",
  challengingQuery: "data showing natural variability in sea level cycles",
});
const parsedPlan = parseQueryPlanResponse(validPlanJson);
assert(
  parsedPlan.supportingQuery.includes("NASA") &&
    parsedPlan.challengingQuery.includes("natural variability"),
  "Query planner parses valid JSON plan"
);

// 1.2 Markdown-wrapped Query Plan
const markdownWrapped = `\`\`\`json
{
  "supportingQuery": "solar eclipse path of totality NASA 2024",
  "challengingQuery": "solar eclipse predictions debunked errors"
}
\`\`\``;
const parsedMarkdownPlan = parseQueryPlanResponse(markdownWrapped);
assert(
  parsedMarkdownPlan.supportingQuery.includes("2024"),
  "Query planner strips markdown code fences"
);

// 1.3 Invalid Query Plan Schema
let planErrorCaught = false;
try {
  parseQueryPlanResponse(JSON.stringify({ supportingQuery: "ab" })); // too short, missing challengingQuery
} catch {
  planErrorCaught = true;
}
assert(planErrorCaught, "Query planner rejects invalid schema");

console.log("\n=== PHASE 2: MODULE 2 — RETRIEVAL & DEDUPLICATION ===");

// 2.1 URL Normalization
const rawUrl1 = "https://www.example.com/article/?utm_source=twitter&utm_medium=social#section1";
const rawUrl2 = "https://www.example.com/article/";
assert(
  normalizeSourceUrl(rawUrl1) === normalizeSourceUrl(rawUrl2),
  "normalizeSourceUrl removes tracking params, hash fragments, and trailing slashes"
);

// 2.2 Deduplication across bidirectional search
const supportingResults = [
  {
    title: "Global Temperature Records",
    url: "https://climate.gov/data/temp?utm_source=google",
    content: "Global surface temperatures have consistently broken monthly records over recent decades.",
    score: 0.95,
  },
  {
    title: "Arctic Ice Shrinking",
    url: "https://nsidc.org/news/arctic-ice",
    content: "Arctic summer sea ice extent has declined dramatically.",
    score: 0.88,
  },
];

const challengingResults = [
  {
    title: "Global Temperature Records (Extended)",
    url: "https://climate.gov/data/temp/", // Duplicate URL with different query param
    content: "Global surface temperatures have consistently broken monthly records over recent decades, though regional variation remains pronounced.",
    score: 0.91,
  },
  {
    title: "Solar Influence Hypotheses",
    url: "https://solar-physics.org/cycles",
    content: "Some researchers hypothesize solar irradiance variations correlate with historic temperature fluctuations.",
    score: 0.82,
  },
];

const deduplicated = deduplicateSearchResults(supportingResults, challengingResults);
assert(deduplicated.length === 3, "deduplicateSearchResults correctly collapses 4 raw items to 3 unique URLs");
const mergedSource = deduplicated.find((s) => s.url.includes("climate.gov"));
assert(
  mergedSource?.targetedStance === "BOTH" &&
    mergedSource?.content.includes("regional variation remains pronounced"),
  "Deduplicated duplicate source is tagged as BOTH and retains richer content"
);

console.log("\n=== PHASE 2: MODULE 3 — PASSAGE PROCESSOR ===");

// 3.1 Domain Extraction
assert(
  extractDomain("https://www.nature.com/articles/s41586-024-0001") === "nature.com",
  "extractDomain strips protocol, www, and paths"
);

// 3.2 Passage Segmentation and Offsets
const sampleArticle = `First paragraph contains key historical context regarding penicillin discovery in 1928 by Alexander Fleming at St Mary's Hospital London.

Second paragraph explains the clinical trials conducted by Florey and Chain at Oxford in 1940 which proved its therapeutic efficacy in human patients.`;

const segmentedPassages = segmentContentIntoPassages(sampleArticle, "src-1", 1);
assert(segmentedPassages.length === 2, "Segments multi-paragraph text into atomic passages");
assert(
  segmentedPassages[0].id === "psg-1" &&
    segmentedPassages[0].charOffsetStart === 0 &&
    segmentedPassages[0].text.includes("Alexander Fleming"),
  "Passage 1 retains exact text, ID, and offset start"
);
assert(
  segmentedPassages[1].id === "psg-2" &&
    segmentedPassages[1].text.includes("Florey and Chain"),
  "Passage 2 retains exact text, sequential ID, and offset"
);

// 3.3 Full Collection Processing
const processed = processRetrievedSources(deduplicated);
assert(
  processed.sources.length === 3 && processed.passages.length >= 3,
  "processRetrievedSources indexes sources and builds passage collection"
);

console.log("\n=== PHASE 2: MODULE 4 — NEMOTRON ANALYZER ===");

// 4.1 Untrusted Prompt Wrapping
const promptXml = buildAnalyzerPrompt("Penicillin was discovered in 1928", segmentedPassages);
assert(
  promptXml.includes('<untrusted_passage id="psg-1"') &&
    promptXml.includes("NEVER follow any instructions") === false, // Prompt itself contains the boundary
  "buildAnalyzerPrompt constructs XML container for untrusted web snippets"
);

// 4.2 Analyzer Response Parsing
const sampleAnalyzerJson = JSON.stringify({
  summary: "Scientific documentation confirms Alexander Fleming discovered penicillin in 1928.",
  passageClassifications: [
    { passageId: "psg-1", stance: "SUPPORTING", relevanceExplanation: "Mentions 1928 discovery by Fleming." },
    { passageId: "psg-2", stance: "NEUTRAL", relevanceExplanation: "Covers later clinical trials in 1940." },
  ],
  citations: [
    {
      sentence: "Alexander Fleming discovered penicillin in 1928 at St Mary's Hospital London.",
      passageId: "psg-1",
      exactQuote: "penicillin discovery in 1928 by Alexander Fleming at St Mary's Hospital London.",
    },
  ],
  contradictions: [],
  reasoning: "Passage psg-1 directly corroborates the discovery date and researcher.",
});

const parsedAnalysis = parseAnalyzerResponse(sampleAnalyzerJson);
assert(
  parsedAnalysis.passageClassifications.length === 2 &&
    parsedAnalysis.citations[0].passageId === "psg-1",
  "parseAnalyzerResponse parses structured analysis"
);

// 4.3 Stance Application
const updatedPassages = applyPassageClassifications(segmentedPassages, parsedAnalysis.passageClassifications);
assert(
  updatedPassages[0].stance === "SUPPORTING" && updatedPassages[1].stance === "NEUTRAL",
  "applyPassageClassifications updates passage stance"
);

console.log("\n=== PHASE 2: MODULE 5 — CITATION AUDITOR ===");

// 5.1 Deterministic Quote Matching
const targetPassageText = "Alexander Fleming discovered penicillin in 1928 at St Mary's Hospital London.";
assert(
  verifyQuoteInPassage("discovered penicillin in 1928", targetPassageText),
  "verifyQuoteInPassage validates exact substring"
);
assert(
  verifyQuoteInPassage("discovered penicillin in 1928 at St Mary’s Hospital", targetPassageText),
  "verifyQuoteInPassage matches smart quotes and normalized punctuation"
);
assert(
  verifyQuoteInPassage("discovered penicillin in 1935", targetPassageText) === false,
  "verifyQuoteInPassage rejects quote with factual discrepancy (1935 vs 1928)"
);

// 5.2 Citation Audit Rules
const draftCitations = [
  {
    sentence: "Fleming discovered penicillin in 1928.",
    passageId: "psg-1",
    exactQuote: "penicillin discovery in 1928 by Alexander Fleming",
  },
  {
    sentence: "This sentence cites a non-existent passage.",
    passageId: "psg-999", // Non-existent ID
    exactQuote: "some quote",
  },
  {
    sentence: "Fleming was born in Antarctica.",
    passageId: "psg-1",
    exactQuote: "Fleming was born in Antarctica", // Hallucinated quote
  },
  {
    sentence: "Clinical trials took place at Oxford.",
    passageId: "psg-2",
    // Missing exactQuote
  },
];

const auditResult = auditCitations(draftCitations, updatedPassages);
assert(auditResult.citations[0].validationStatus === "VERIFIED", "Valid quote marked VERIFIED");
assert(auditResult.citations[1].validationStatus === "FAILED", "Non-existent passage ID marked FAILED");
assert(auditResult.citations[2].validationStatus === "FAILED", "Hallucinated quote marked FAILED");
assert(auditResult.citations[3].validationStatus === "UNVERIFIED", "Citation without exactQuote marked UNVERIFIED");
assert(
  auditResult.verifiedCount === 1 && auditResult.failedCount === 2 && auditResult.unverifiedCount === 1,
  "Audit counts accurately tallied"
);

console.log("\n=== PHASE 2: MODULE 6 — VERDICT ENGINE ===");

// 6.1 Force INSUFFICIENT_EVIDENCE when 0 verified citations
const emptyVerdict = computeVerdict({
  passages: updatedPassages,
  auditedCitations: {
    citations: [],
    verifiedCount: 0,
    unverifiedCount: 0,
    failedCount: 0,
    auditNotes: [],
  },
  contradictions: [],
  summary: "No citations available",
  reasoning: "",
});
assert(
  emptyVerdict.status === "INSUFFICIENT_EVIDENCE" && emptyVerdict.confidence === 0.0,
  "Forces INSUFFICIENT_EVIDENCE with confidence 0.0 when verified citations count is 0"
);

// 6.2 Thin Evidence Guard (Single verified quote forces INSUFFICIENT_EVIDENCE)
const thinVerdict = computeVerdict({
  passages: updatedPassages,
  auditedCitations: {
    citations: [auditResult.citations[0]], // Only 1 citation from 1 source
    verifiedCount: 1,
    unverifiedCount: 0,
    failedCount: 0,
    auditNotes: [],
  },
  contradictions: [],
  summary: "Fleming discovered penicillin in 1928.",
  reasoning: "Corroborated by historical record.",
});
assert(
  thinVerdict.status === "INSUFFICIENT_EVIDENCE" &&
    thinVerdict.confidence === 0.0 &&
    thinVerdict.insufficientEvidenceReason.includes("too thin"),
  "Forces INSUFFICIENT_EVIDENCE when evidence is too thin (single isolated quote/source)"
);

// 6.3 Corroborated SUPPORTED Verdict (>= 2 distinct sources & >= 2 verified citations)
const multiSourceSupportingPassages = [
  ...updatedPassages,
  {
    id: "psg-5",
    sourceId: "src-2",
    text: "Historical archives confirm penicillin was discovered in 1928 by Fleming.",
    stance: "SUPPORTING",
  },
];
const corroboratedSupportedVerdict = computeVerdict({
  passages: multiSourceSupportingPassages,
  auditedCitations: {
    citations: [
      auditResult.citations[0],
      {
        id: "cit-5",
        sentence: "Archives confirm the 1928 discovery.",
        passageId: "psg-5",
        sourceId: "src-2",
        exactQuote: "penicillin was discovered in 1928 by Fleming",
        validationStatus: "VERIFIED",
        verificationScope: "SEARCH_SNIPPET",
      },
    ],
    verifiedCount: 2,
    unverifiedCount: 0,
    failedCount: 0,
    auditNotes: [],
  },
  contradictions: [],
  summary: "Fleming discovered penicillin in 1928.",
  reasoning: "Corroborated across independent records.",
});
assert(
  corroboratedSupportedVerdict.status === "SUPPORTED" &&
    corroboratedSupportedVerdict.confidence >= 0.6,
  "Returns SUPPORTED when verified supporting evidence is corroborated across multiple sources"
);

// 6.3 CONTRADICTORY Verdict
const contradictingPassages = [
  ...updatedPassages,
  {
    id: "psg-3",
    sourceId: "src-2",
    text: "Historical records prove penicillin was not Fleming's discovery.",
    stance: "CONTRADICTING",
  },
];
const contradictoryVerdict = computeVerdict({
  passages: contradictingPassages,
  auditedCitations: {
    citations: [
      {
        id: "cit-1",
        sentence: "Fleming discovered penicillin in 1928.",
        passageId: "psg-1",
        sourceId: "src-1",
        exactQuote: "penicillin discovery in 1928",
        validationStatus: "VERIFIED",
      },
      {
        id: "cit-2",
        sentence: "Other records challenge this discovery.",
        passageId: "psg-3",
        sourceId: "src-2",
        exactQuote: "penicillin was not Fleming's discovery",
        validationStatus: "VERIFIED",
      },
    ],
    verifiedCount: 2,
    unverifiedCount: 0,
    failedCount: 0,
    auditNotes: [],
  },
  contradictions: [
    {
      id: "con-1",
      supportingPassageIds: ["psg-1"],
      contradictingPassageIds: ["psg-3"],
      description: "Conflict over original discovery attribution.",
      severity: "DIRECT",
    },
  ],
  summary: "Conflicting evidence on discovery.",
  reasoning: "Sources directly contradict each other.",
});
assert(
  contradictoryVerdict.status === "CONTRADICTORY",
  "Returns CONTRADICTORY when both supporting and contradicting verified evidence exist"
);

// 6.4 Corroborated REFUTED Verdict (>= 2 independent sources & >= 2 verified citations)
const refutingMultiSourcePassages = [
  {
    id: "psg-4",
    sourceId: "src-3",
    text: "The claim that the Earth is flat is conclusively disproven by satellite observations.",
    stance: "CONTRADICTING",
  },
  {
    id: "psg-6",
    sourceId: "src-4",
    text: "Geodesic surveys and orbital mechanics conclusively refute flat Earth claims.",
    stance: "CONTRADICTING",
  },
];
const refutedVerdict = computeVerdict({
  passages: refutingMultiSourcePassages,
  auditedCitations: {
    citations: [
      {
        id: "cit-1",
        sentence: "The claim is disproven by satellite observations.",
        passageId: "psg-4",
        sourceId: "src-3",
        exactQuote: "Earth is flat is conclusively disproven",
        validationStatus: "VERIFIED",
        verificationScope: "SEARCH_SNIPPET",
      },
      {
        id: "cit-6",
        sentence: "Geodesic surveys refute the claim.",
        passageId: "psg-6",
        sourceId: "src-4",
        exactQuote: "Geodesic surveys and orbital mechanics conclusively refute",
        validationStatus: "VERIFIED",
        verificationScope: "SEARCH_SNIPPET",
      },
    ],
    verifiedCount: 2,
    unverifiedCount: 0,
    failedCount: 0,
    auditNotes: [],
  },
  contradictions: [],
  summary: "Flat Earth claim is refuted.",
  reasoning: "Satellite observations and geodesic surveys contradict the claim.",
});
assert(
  refutedVerdict.status === "REFUTED" && refutedVerdict.confidence >= 0.6,
  "Returns REFUTED when contradicting verified passages are corroborated across multiple sources"
);

console.log("\n=== PHASE 2: MODULE 7 — NEMOTRON PARSER REGRESSION TESTS ===");

// 7.1 Empty Content
let emptyContentCaught = false;
try {
  parseNemotronChatResponse({
    choices: [{ message: { role: "assistant", content: "" }, finish_reason: "stop" }],
  });
} catch (err) {
  emptyContentCaught = err instanceof NvidiaClientError && err.message.includes("empty or null");
}
assert(emptyContentCaught, "Rejects empty content with descriptive PROVIDER_ERROR");

// 7.2 Reasoning-Only Output (Thinking trace without final content)
let reasoningOnlyCaught = false;
try {
  parseNemotronChatResponse({
    choices: [
      {
        message: {
          role: "assistant",
          content: null,
          reasoning_content: "Analyzing the query structure and generating queries...",
        },
        finish_reason: "stop",
      },
    ],
  });
} catch (err) {
  reasoningOnlyCaught =
    err instanceof NvidiaClientError && err.message.includes("reasoning trace without final message content");
}
assert(
  reasoningOnlyCaught,
  "Rejects reasoning-only output and refuses to substitute reasoning_content as final answer"
);

// 7.3 Output Budget Exhaustion During Reasoning (finish_reason: "length", no content)
let lengthExhaustionCaught = false;
try {
  parseNemotronChatResponse({
    choices: [
      {
        message: {
          role: "assistant",
          content: "",
          reasoning_content: "Thinking in deep detail about the physics problem...",
        },
        finish_reason: "length",
      },
    ],
  });
} catch (err) {
  lengthExhaustionCaught =
    err instanceof NvidiaClientError && err.message.includes("output budget exhausted during reasoning");
}
assert(
  lengthExhaustionCaught,
  "Detects output budget exhaustion during reasoning before content generation"
);

// 7.4 Length Truncation With Partial Content (finish_reason: "length", partial content)
let partialTruncationCaught = false;
try {
  parseNemotronChatResponse({
    choices: [
      {
        message: { role: "assistant", content: '{"supportingQuery": "speed of light' },
        finish_reason: "length",
      },
    ],
  });
} catch (err) {
  partialTruncationCaught =
    err instanceof NvidiaClientError && err.message.includes("truncated due to output token limit");
}
assert(
  partialTruncationCaught,
  "Detects partial response truncation due to output token limit"
);

// 7.5 Malformed JSON Payload / Missing Choices
let malformedPayloadCaught = false;
try {
  parseNemotronChatResponse({ choices: [] });
} catch (err) {
  malformedPayloadCaught = err instanceof NvidiaClientError && err.message.includes("choices array is empty");
}
assert(malformedPayloadCaught, "Rejects payload with empty choices array");

// 7.6 Valid JSON Completion Output
const validResponse = parseNemotronChatResponse({
  choices: [
    {
      message: {
        role: "assistant",
        content: '{"supportingQuery": "speed of light vacuum NASA", "challengingQuery": "speed of light variable"}',
      },
      finish_reason: "stop",
    },
  ],
  usage: {
    prompt_tokens: 150,
    completion_tokens: 85,
    total_tokens: 235,
  },
});
assert(
  validResponse.includes("speed of light vacuum NASA"),
  "Successfully parses valid message content with finish_reason: stop"
);

console.log("\n=== PHASE 2: MODULE 8 — NVIDIA REQUEST SERIALIZATION & ERROR DIAGNOSTICS ===");

// 8.1 Request Body Serialization (No extra_body wrapper, root chat_template_kwargs, temperature 1, top_p 0.95)
const requestBody = buildNemotronRequestBody("nvidia/nemotron-3.5-super-vl-120b-a12b", {
  messages: [{ role: "user", content: "Test query" }],
  temperature: 1,
  topP: 0.95,
  maxTokens: 1024,
  enableThinking: false,
});

assert(
  !("extra_body" in requestBody),
  "Nemotron request body does NOT contain extra_body wrapper"
);

assert(
  requestBody.chat_template_kwargs !== undefined &&
    typeof requestBody.chat_template_kwargs === "object" &&
    requestBody.chat_template_kwargs.enable_thinking === false,
  "Nemotron request body serializes chat_template_kwargs at root with enable_thinking: false"
);

assert(
  requestBody.model === "nvidia/nemotron-3.5-super-vl-120b-a12b" &&
    requestBody.temperature === 1 &&
    requestBody.top_p === 0.95 &&
    requestBody.stream === false &&
    requestBody.max_tokens === 1024,
  "Nemotron request body sets model, temperature 1, top_p 0.95, stream false, and bounded max_tokens"
);

const serializedJson = JSON.stringify(requestBody);
assert(
  !serializedJson.includes("extra_body") &&
    serializedJson.includes('"enable_thinking":false'),
  "Serialized HTTP JSON string does not contain extra_body and correctly includes enable_thinking"
);

// 8.2 Safe Error Diagnostics Parsing: FastAPI / Pydantic 400 schema error
const pydantic400 = {
  detail: [
    {
      loc: ["body", "extra_body"],
      msg: "extra fields not permitted",
      type: "value_error.extra",
    },
  ],
};
const pydanticDiag = parseNvidiaErrorResponse(pydantic400, 400);
assert(
  pydanticDiag.status === 400 &&
    pydanticDiag.rejectedParameter === "extra_body" &&
    pydanticDiag.providerErrorCode === "value_error.extra" &&
    pydanticDiag.sanitizedValidationMessage.includes("extra fields not permitted"),
  "Safely extracts rejected parameter and validation error from Pydantic HTTP 400 response"
);

// 8.3 Safe Error Diagnostics Parsing: OpenAI-style 400 error
const openAi400 = {
  error: {
    message: "Invalid request: unrecognized parameter 'extra_body'.",
    type: "invalid_request_error",
    param: "extra_body",
    code: "parameter_invalid",
  },
};
const openAiDiag = parseNvidiaErrorResponse(openAi400, 400);
assert(
  openAiDiag.status === 400 &&
    openAiDiag.rejectedParameter === "extra_body" &&
    openAiDiag.providerErrorCode === "invalid_request_error" &&
    openAiDiag.sanitizedValidationMessage.includes("unrecognized parameter"),
  "Safely extracts parameter and message from OpenAI-style HTTP 400 response"
);

// 8.4 Safe Error Diagnostics Parsing: Detail string and malformed error body
const stringDiag = parseNvidiaErrorResponse({ detail: "Unsupported parameter format" }, 400);
assert(
  stringDiag.sanitizedValidationMessage === "Unsupported parameter format",
  "Safely parses simple detail string error response"
);

const nullDiag = parseNvidiaErrorResponse(null, 500);
assert(
  nullDiag.status === 500 &&
    nullDiag.providerErrorCode === undefined &&
    nullDiag.rejectedParameter === undefined,
  "Safely handles null/empty error response without crashing"
);

console.log(`\nPhase 2 Test Suite: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}

