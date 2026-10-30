import { z } from "zod";
import type {
  Claim,
  EvidenceCitation,
  EvidencePassage,
  EvidenceReport,
  EvidenceSource,
  Contradiction,
  Verdict,
  VerdictStatus,
} from "@/lib/schemas/report";

export const InvestigateRequestSchema = z.object({
  claim: z
    .string()
    .trim()
    .min(5, "Claim must be at least 5 characters long")
    .max(500, "Claim must not exceed 500 characters"),
});

export type InvestigateRequest = z.infer<typeof InvestigateRequestSchema>;

export type InvestigateSuccessResponse = {
  success: true;
  data: EvidenceReport;
};

export type InvestigateErrorResponse = {
  success: false;
  error: {
    code:
      | "BAD_REQUEST"
      | "MISSING_CONFIG"
      | "RATE_LIMITED"
      | "BUDGET_EXHAUSTED"
      | "CREDIT_PROTECTION_LOCKED"
      | "STAGE_NOT_IMPLEMENTED"
      | "GATEWAY_TIMEOUT"
      | "PROVIDER_ERROR"
      | "INTERNAL_ERROR";
    message: string;
    details?: unknown;
  };
};

export type InvestigateApiResponse = InvestigateSuccessResponse | InvestigateErrorResponse;

export type {
  Claim,
  EvidenceCitation,
  EvidencePassage,
  EvidenceReport,
  EvidenceSource,
  Contradiction,
  Verdict,
  VerdictStatus,
};

