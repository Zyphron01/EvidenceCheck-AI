import type {
  Verdict,
  EvidencePassage,
  Contradiction,
} from "../schemas/report.ts";
import type { AuditedCitationResult } from "./citations.ts";

export interface VerdictEngineInput {
  passages: EvidencePassage[];
  auditedCitations: AuditedCitationResult;
  contradictions: Contradiction[];
  summary: string;
  reasoning: string;
}

const CONFIDENCE_INTERPRETATION =
  "Heuristic support index based on verified source diversity and citation consistency; not a calibrated statistical probability.";

/**
 * Deterministically compute the verdict and confidence score based on verified evidence.
 * Strict rules:
 * 1. Never equate a single isolated quote or single source with sufficient proof of factual truth.
 * 2. Force INSUFFICIENT_EVIDENCE when evidence is too thin, irrelevant, or unverified.
 * 3. Never display numeric confidence as a calibrated statistical probability.
 */
export function computeVerdict(input: VerdictEngineInput): Verdict {
  const { passages, auditedCitations, contradictions, summary, reasoning } = input;

  const verifiedCitations = auditedCitations.citations.filter(
    (c) => c.validationStatus === "VERIFIED"
  );

  // Group passages by classified stance
  const supportingPassages = passages.filter((p) => p.stance === "SUPPORTING");
  const contradictingPassages = passages.filter((p) => p.stance === "CONTRADICTING");

  // Determine distinct source counts for supporting and contradicting evidence
  const supportingSources = new Set(supportingPassages.map((p) => p.sourceId));
  const contradictingSources = new Set(contradictingPassages.map((p) => p.sourceId));

  // Count verified citations linked to supporting vs contradicting passages
  const passageMap = new Map(passages.map((p) => [p.id, p]));
  let verifiedSupportingCitationCount = 0;
  let verifiedContradictingCitationCount = 0;

  for (const c of verifiedCitations) {
    const p = passageMap.get(c.passageId);
    if (p?.stance === "SUPPORTING") {
      verifiedSupportingCitationCount++;
    } else if (p?.stance === "CONTRADICTING") {
      verifiedContradictingCitationCount++;
    }
  }

  // --- RULE 1: FORCE INSUFFICIENT_EVIDENCE FOR ZERO / UNVERIFIED EVIDENCE ---
  if (
    passages.length === 0 ||
    (supportingPassages.length === 0 && contradictingPassages.length === 0) ||
    verifiedCitations.length === 0
  ) {
    let reason = "No verified citations from authoritative sources could be matched to the claim.";
    if (passages.length === 0) {
      reason = "Web retrieval returned zero relevant passages for the query.";
    } else if (supportingPassages.length === 0 && contradictingPassages.length === 0) {
      reason = "Retrieved passages contain only neutral or contextual background without direct evidence proving or disproving the claim.";
    } else if (auditedCitations.failedCount > 0 && verifiedCitations.length === 0) {
      reason = "All candidate citations failed deterministic quotation verification against source snippets.";
    }

    return {
      status: "INSUFFICIENT_EVIDENCE",
      confidence: 0.0,
      confidenceInterpretation: CONFIDENCE_INTERPRETATION,
      summary: summary || "Insufficient evidence available to substantiate or refute the claim.",
      reasoning: `${reason} ${reasoning}`.trim(),
      insufficientEvidenceReason: reason,
    };
  }

  // --- RULE 2: CONTRADICTORY VERDICT ---
  const hasDirectContradiction = contradictions.some((c) => c.severity === "DIRECT");
  const hasBothVerifiedSides =
    (supportingPassages.length > 0 && contradictingPassages.length > 0) &&
    (verifiedSupportingCitationCount > 0 && verifiedContradictingCitationCount > 0);

  if (hasDirectContradiction || hasBothVerifiedSides) {
    const totalDistinctSources = new Set([...supportingSources, ...contradictingSources]).size;
    const rawConf = 0.5 + Math.min(0.35, totalDistinctSources * 0.1);
    const confidence = Math.min(0.85, Math.max(0.5, Math.round(rawConf * 100) / 100));

    return {
      status: "CONTRADICTORY",
      confidence,
      confidenceInterpretation: CONFIDENCE_INTERPRETATION,
      summary,
      reasoning: `Direct evidentiary conflict detected: Found ${supportingPassages.length} supporting passage(s) across ${supportingSources.size} source(s) and ${contradictingPassages.length} contradicting passage(s) across ${contradictingSources.size} source(s). ${reasoning}`,
    };
  }

  // --- RULE 3: EVIDENCE TOO THIN (Single isolated quote or uncorroborated single source) ---
  // A single verified quote from one source is NOT sufficient to declare factual truth.
  if (supportingPassages.length > 0 && contradictingPassages.length === 0) {
    if (supportingSources.size < 2 || verifiedSupportingCitationCount < 2) {
      const thinReason = `Evidence is too thin: Found only ${supportingPassages.length} passage(s) from ${supportingSources.size} source with ${verifiedSupportingCitationCount} verified citation. Factual verification requires corroboration across multiple independent sources.`;
      return {
        status: "INSUFFICIENT_EVIDENCE",
        confidence: 0.0,
        confidenceInterpretation: CONFIDENCE_INTERPRETATION,
        summary: summary || "Evidence is too thin to substantiate the claim.",
        reasoning: `${thinReason} ${reasoning}`.trim(),
        insufficientEvidenceReason: thinReason,
      };
    }

    // Corroborated SUPPORTED verdict (at least 2 distinct sources & 2 verified citations)
    const baseScore = 0.65;
    const sourceBonus = Math.min(0.2, (supportingSources.size - 2) * 0.1);
    const citationBonus = Math.min(0.15, (verifiedSupportingCitationCount - 2) * 0.05);
    const penalty = auditedCitations.failedCount * 0.1;

    const calculatedConfidence = Math.min(
      0.95,
      Math.max(0.5, Math.round((baseScore + sourceBonus + citationBonus - penalty) * 100) / 100)
    );

    return {
      status: "SUPPORTED",
      confidence: calculatedConfidence,
      confidenceInterpretation: CONFIDENCE_INTERPRETATION,
      summary,
      reasoning: `Claim is corroborated by ${supportingPassages.length} verified passage(s) across ${supportingSources.size} independent source(s) with ${verifiedSupportingCitationCount} verified citation(s). ${reasoning}`,
    };
  }

  // --- RULE 4: REFUTED VERDICT ---
  if (contradictingPassages.length > 0 && supportingPassages.length === 0) {
    if (contradictingSources.size < 2 || verifiedContradictingCitationCount < 2) {
      const thinReason = `Evidence is too thin: Found only ${contradictingPassages.length} challenging passage(s) from ${contradictingSources.size} source with ${verifiedContradictingCitationCount} verified citation. Factual refutation requires corroboration across multiple independent sources.`;
      return {
        status: "INSUFFICIENT_EVIDENCE",
        confidence: 0.0,
        confidenceInterpretation: CONFIDENCE_INTERPRETATION,
        summary: summary || "Evidence is too thin to refute the claim.",
        reasoning: `${thinReason} ${reasoning}`.trim(),
        insufficientEvidenceReason: thinReason,
      };
    }

    // Corroborated REFUTED verdict (at least 2 distinct sources & 2 verified citations)
    const baseScore = 0.65;
    const sourceBonus = Math.min(0.2, (contradictingSources.size - 2) * 0.1);
    const citationBonus = Math.min(0.15, (verifiedContradictingCitationCount - 2) * 0.05);
    const penalty = auditedCitations.failedCount * 0.1;

    const calculatedConfidence = Math.min(
      0.95,
      Math.max(0.5, Math.round((baseScore + sourceBonus + citationBonus - penalty) * 100) / 100)
    );

    return {
      status: "REFUTED",
      confidence: calculatedConfidence,
      confidenceInterpretation: CONFIDENCE_INTERPRETATION,
      summary,
      reasoning: `Claim is refuted by ${contradictingPassages.length} verified passage(s) across ${contradictingSources.size} independent source(s) with ${verifiedContradictingCitationCount} verified citation(s). ${reasoning}`,
    };
  }

  // Default fallback
  return {
    status: "INSUFFICIENT_EVIDENCE",
    confidence: 0.0,
    confidenceInterpretation: CONFIDENCE_INTERPRETATION,
    summary: summary || "Evidentiary assessment is inconclusive.",
    reasoning: `Evidence balance does not meet verification thresholds. ${reasoning}`,
    insufficientEvidenceReason: "Evidentiary balance does not meet corroboration thresholds.",
  };
}
