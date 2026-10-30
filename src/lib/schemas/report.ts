import { z } from "zod";

/**
 * Verdict status representing evidence outcome.
 * Includes explicit INSUFFICIENT_EVIDENCE state.
 */
export const VerdictStatusSchema = z.enum([
  "SUPPORTED",
  "REFUTED",
  "CONTRADICTORY",
  "INSUFFICIENT_EVIDENCE",
]);

export type VerdictStatus = z.infer<typeof VerdictStatusSchema>;

export const VerdictSchema = z.object({
  status: VerdictStatusSchema,
  confidence: z.number().min(0).max(1),
  confidenceInterpretation: z
    .string()
    .default(
      "Heuristic support index based on verified source diversity and citation consistency; not a calibrated statistical probability."
    ),
  summary: z.string().min(1),
  reasoning: z.string().min(1),
  insufficientEvidenceReason: z.string().optional(),
});

export type Verdict = z.infer<typeof VerdictSchema>;

export const ClaimSchema = z.object({
  id: z.string().min(1),
  rawText: z.string().min(1),
  normalizedText: z.string().min(1),
  submittedAt: z.string().datetime(),
});

export type Claim = z.infer<typeof ClaimSchema>;

export const EvidenceSourceSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  title: z.string().min(1),
  domain: z.string().min(1),
  snippet: z.string().optional(),
  publishedDate: z.string().optional(),
  retrievedAt: z.string().datetime(),
});

export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

export const PassageStanceSchema = z.enum([
  "SUPPORTING",
  "CONTRADICTING",
  "NEUTRAL",
]);

export type PassageStance = z.infer<typeof PassageStanceSchema>;

export const EvidencePassageSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  text: z.string().min(1),
  stance: PassageStanceSchema,
  charOffsetStart: z.number().int().nonnegative().optional(),
  charOffsetEnd: z.number().int().nonnegative().optional(),
});

export type EvidencePassage = z.infer<typeof EvidencePassageSchema>;

export const CitationValidationStatusSchema = z.enum([
  "VERIFIED",
  "UNVERIFIED",
  "FAILED",
]);

export type CitationValidationStatus = z.infer<typeof CitationValidationStatusSchema>;

export const VerificationScopeSchema = z.enum(["SEARCH_SNIPPET", "FULL_WEBPAGE"]);

export type VerificationScope = z.infer<typeof VerificationScopeSchema>;

export const EvidenceCitationSchema = z.object({
  id: z.string().min(1),
  sentence: z.string().min(1),
  passageId: z.string().min(1),
  sourceId: z.string().min(1),
  exactQuote: z.string().optional(),
  validationStatus: CitationValidationStatusSchema,
  verificationScope: VerificationScopeSchema.default("SEARCH_SNIPPET"),
});

export type EvidenceCitation = z.infer<typeof EvidenceCitationSchema>;

export const ContradictionSeveritySchema = z.enum([
  "DIRECT",
  "NUANCED",
  "CONTEXTUAL",
]);

export type ContradictionSeverity = z.infer<typeof ContradictionSeveritySchema>;

export const ContradictionSchema = z.object({
  id: z.string().min(1),
  supportingPassageIds: z.array(z.string().min(1)),
  contradictingPassageIds: z.array(z.string().min(1)),
  description: z.string().min(1),
  severity: ContradictionSeveritySchema,
});

export type Contradiction = z.infer<typeof ContradictionSchema>;

export const ReportMetadataSchema = z.object({
  pipelineVersion: z.string(),
  createdAt: z.string().datetime(),
  searchesConducted: z.number().int().nonnegative(),
  modelUsed: z.string().optional(),
});

export type ReportMetadata = z.infer<typeof ReportMetadataSchema>;

export const EvidenceReportSchema = z.object({
  id: z.string().min(1),
  claim: ClaimSchema,
  verdict: VerdictSchema,
  sources: z.array(EvidenceSourceSchema),
  passages: z.array(EvidencePassageSchema),
  citations: z.array(EvidenceCitationSchema),
  contradictions: z.array(ContradictionSchema),
  metadata: ReportMetadataSchema,
});

export type EvidenceReport = z.infer<typeof EvidenceReportSchema>;

