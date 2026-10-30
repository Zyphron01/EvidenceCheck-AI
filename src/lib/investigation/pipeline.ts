import { randomUUID } from "node:crypto";
import {
  type Claim,
  type EvidenceReport,
  EvidenceReportSchema,
  type Contradiction,
} from "../schemas/report.ts";
import { planInvestigationQueries } from "../ai/query-planner.ts";
import { executeDualRetrieval } from "../research/retrieval.ts";
import { processRetrievedSources } from "../research/passages.ts";
import {
  analyzeEvidenceWithNemotron,
  applyPassageClassifications,
} from "../ai/analyzer.ts";
import { auditCitations } from "../verification/citations.ts";
import { computeVerdict } from "../verification/verdict.ts";
import { saveReport } from "../db/storage.ts";

export interface PipelineExecutionOptions {
  claimText: string;
  normalizedClaim: string;
}

/**
 * Execute the complete citation-audited, contradiction-aware evidence investigation pipeline.
 * Server-side only. Does NOT fabricate sources, reports, quotes, or verdicts.
 */
export async function runInvestigationPipeline(
  options: PipelineExecutionOptions
): Promise<EvidenceReport> {
  const { claimText, normalizedClaim } = options;
  const investigationId = `rep-${randomUUID()}`;
  const now = new Date().toISOString();

  const claim: Claim = {
    id: `clm-${randomUUID()}`,
    rawText: claimText,
    normalizedText: normalizedClaim,
    submittedAt: now,
  };

  // 1. Generate Bidirectional Search Queries via Nemotron
  const queryPlan = await planInvestigationQueries(claimText);

  // 2. Dual Tavily Retrieval (supporting + challenging)
  const retrievalResult = await executeDualRetrieval(queryPlan);

  // 3. Extract and Segment into Sources and Atomic Passages
  const processed = processRetrievedSources(retrievalResult.sources);

  // 4. Handle Empty Retrieval Case Honestly (Immediate Insufficient Evidence)
  if (processed.passages.length === 0) {
    const insufficientReport: EvidenceReport = {
      id: investigationId,
      claim,
      verdict: {
        status: "INSUFFICIENT_EVIDENCE",
        confidence: 0.0,
        confidenceInterpretation:
          "Heuristic support index based on verified source diversity and citation consistency; not a calibrated statistical probability.",
        summary: "No verifiable web sources were discovered for the submitted claim.",
        reasoning:
          "Both supporting and challenging search queries returned zero usable web passages.",
        insufficientEvidenceReason: "Dual web search returned no indexable text.",
      },
      sources: processed.sources,
      passages: [],
      citations: [],
      contradictions: [],
      metadata: {
        pipelineVersion: "2.0.0",
        createdAt: now,
        searchesConducted: retrievalResult.searchesConducted,
        modelUsed: process.env.NVIDIA_MODEL,
      },
    };
    return EvidenceReportSchema.parse(insufficientReport);
  }

  // 5. Analyze Passages and Synthesize Findings via Nemotron
  const analysis = await analyzeEvidenceWithNemotron(claimText, processed.passages);

  // 6. Apply Classified Stances to Retained Passages
  const classifiedPassages = applyPassageClassifications(
    processed.passages,
    analysis.passageClassifications
  );

  // 7. Format and Index Identified Contradictions
  const contradictions: Contradiction[] = analysis.contradictions.map((c, idx) => ({
    id: `con-${idx + 1}`,
    supportingPassageIds: c.supportingPassageIds,
    contradictingPassageIds: c.contradictingPassageIds,
    description: c.description,
    severity: c.severity,
  }));

  // 8. Deterministically Audit All Citations Against Retained Passages
  const auditedCitationsResult = auditCitations(analysis.citations, classifiedPassages);

  // 9. Deterministically Compute Final Verdict and Confidence Score
  const verdict = computeVerdict({
    passages: classifiedPassages,
    auditedCitations: auditedCitationsResult,
    contradictions,
    summary: analysis.summary,
    reasoning: analysis.reasoning,
  });

  // 10. Assemble and Validate Complete Final Evidence Report
  const report: EvidenceReport = {
    id: investigationId,
    claim,
    verdict,
    sources: processed.sources,
    passages: classifiedPassages,
    citations: auditedCitationsResult.citations,
    contradictions,
    metadata: {
      pipelineVersion: "2.0.0",
      createdAt: now,
      searchesConducted: retrievalResult.searchesConducted,
      modelUsed: process.env.NVIDIA_MODEL,
    },
  };

  const validatedReport = EvidenceReportSchema.parse(report);

  // Attempt durable persistence if DATABASE_URL is configured
  try {
    await saveReport(validatedReport);
  } catch {
    // Non-blocking: report is still returned to the caller even if persistence fails
  }

  return validatedReport;
}

