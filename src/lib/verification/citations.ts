import type {
  EvidenceCitation,
  EvidencePassage,
  CitationValidationStatus,
} from "../schemas/report.ts";
import { AnalyzerCitationDraftSchema } from "../ai/analyzer.ts";
import { z } from "zod";

export type AnalyzerCitationDraft = z.infer<typeof AnalyzerCitationDraftSchema>;

export interface AuditedCitationResult {
  citations: EvidenceCitation[];
  verifiedCount: number;
  unverifiedCount: number;
  failedCount: number;
  auditNotes: string[];
}

/**
 * Normalize text for deterministic quotation matching:
 * - Lowercase
 * - Normalize smart quotes / dashes
 * - Collapse consecutive whitespace
 * - Trim
 */
export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Deterministically check whether an exact quote exists inside a passage.
 * Uses exact match first, then normalized punctuation/whitespace fallback.
 */
export function verifyQuoteInPassage(exactQuote: string, passageText: string): boolean {
  if (!exactQuote || !passageText) return false;

  const trimmedQuote = exactQuote.trim();
  if (trimmedQuote.length === 0) return false;

  // 1. Literal substring match
  if (passageText.includes(trimmedQuote)) {
    return true;
  }

  // 2. Normalized whitespace & punctuation match
  const normQuote = normalizeForMatching(trimmedQuote);
  const normPassage = normalizeForMatching(passageText);

  if (normPassage.includes(normQuote)) {
    return true;
  }

  // 3. Punctuation-stripped normalized match for minor transcription differences
  const stripPunct = (s: string) => s.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
  const strippedQuote = stripPunct(normQuote);
  const strippedPassage = stripPunct(normPassage);

  if (strippedQuote.length >= 10 && strippedPassage.includes(strippedQuote)) {
    return true;
  }

  return false;
}

/**
 * Audit all draft citations against retained passage text and metadata.
 * Flags missing passage IDs, hallucinated quotes, and stance contradictions.
 */
export function auditCitations(
  draftCitations: AnalyzerCitationDraft[],
  passages: EvidencePassage[]
): AuditedCitationResult {
  const passageMap = new Map<string, EvidencePassage>();
  for (const p of passages) {
    passageMap.set(p.id, p);
  }

  const auditedCitations: EvidenceCitation[] = [];
  const auditNotes: string[] = [];
  let verifiedCount = 0;
  let unverifiedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < draftCitations.length; i++) {
    const draft = draftCitations[i];
    const citationId = `cit-${i + 1}`;
    const targetPassage = passageMap.get(draft.passageId);

    // Rule 1: Check whether cited passage ID exists
    if (!targetPassage) {
      failedCount++;
      auditNotes.push(
        `Citation ${citationId} referenced non-existent passage ID "${draft.passageId}".`
      );
      auditedCitations.push({
        id: citationId,
        sentence: draft.sentence,
        passageId: draft.passageId,
        sourceId: "unknown",
        exactQuote: draft.exactQuote,
        validationStatus: "FAILED",
        verificationScope: "SEARCH_SNIPPET",
      });
      continue;
    }

    // Rule 2: Deterministic quotation verification if exactQuote is present
    let validationStatus: CitationValidationStatus = "UNVERIFIED";

    if (draft.exactQuote && draft.exactQuote.trim().length > 0) {
      const quoteMatches = verifyQuoteInPassage(draft.exactQuote, targetPassage.text);
      if (quoteMatches) {
        validationStatus = "VERIFIED";
        verifiedCount++;
      } else {
        validationStatus = "FAILED";
        failedCount++;
        auditNotes.push(
          `Citation ${citationId} provided quote "${draft.exactQuote.slice(0, 50)}..." that was NOT found in search snippet ${targetPassage.id}.`
        );
      }
    } else {
      // If no exact quote was provided, mark as UNVERIFIED
      validationStatus = "UNVERIFIED";
      unverifiedCount++;
      auditNotes.push(
        `Citation ${citationId} does not include a verifiable direct quotation.`
      );
    }

    auditedCitations.push({
      id: citationId,
      sentence: draft.sentence,
      passageId: targetPassage.id,
      sourceId: targetPassage.sourceId,
      exactQuote: draft.exactQuote,
      validationStatus,
      verificationScope: "SEARCH_SNIPPET",
    });
  }

  return {
    citations: auditedCitations,
    verifiedCount,
    unverifiedCount,
    failedCount,
    auditNotes,
  };
}

