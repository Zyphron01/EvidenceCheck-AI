import { z } from "zod";
import { createNemotronCompletion } from "./nvidia.ts";

export const QueryPlanSchema = z.object({
  supportingQuery: z
    .string()
    .trim()
    .min(3, "Supporting query must be at least 3 characters")
    .max(250, "Supporting query must not exceed 250 characters"),
  challengingQuery: z
    .string()
    .trim()
    .min(3, "Challenging query must be at least 3 characters")
    .max(250, "Challenging query must not exceed 250 characters"),
});

export type QueryPlan = z.infer<typeof QueryPlanSchema>;

const SYSTEM_PROMPT = `You are an expert evidence retrieval planner for a citation-audited fact-checking system.
Given a factual claim, formulate two distinct, concise, objective web search queries:
1. "supportingQuery": A neutral search query aimed at discovering primary evidence, data, or documentation that could confirm the claim.
2. "challengingQuery": A neutral or adversarial search query aimed at discovering counter-evidence, debunkings, criticisms, or opposing facts that challenge the claim.

Rules:
- Never assume the claim is true or false.
- Queries must be keyword-focused and suitable for a web search engine.
- Output MUST be valid JSON only with keys "supportingQuery" and "challengingQuery". Do not include additional commentary.`;

/**
 * Deterministically parse and validate the JSON output from the query planner prompt.
 * Handles markdown code block stripping and Zod validation.
 */
export function parseQueryPlanResponse(rawResponse: string): QueryPlan {
  let cleaned = rawResponse.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    // Attempt extracting the first JSON object using regex
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      parsedJson = JSON.parse(match[0]);
    } else {
      throw new Error("Query planner response does not contain valid JSON.");
    }
  }

  const result = QueryPlanSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(
      `Query planner output failed schema validation: ${result.error.issues.map((i) => i.message).join(", ")}`
    );
  }

  return result.data;
}

/**
 * Generate bidirectional search queries for a given claim using NVIDIA Nemotron.
 */
export async function planInvestigationQueries(claim: string): Promise<QueryPlan> {
  const userPrompt = `Factual claim to investigate:\n"${claim.trim()}"\n\nGenerate the JSON query plan:`;

  const rawCompletion = await createNemotronCompletion({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 1,
    topP: 0.95,
    maxTokens: 1024,
    enableThinking: false,
  });

  return parseQueryPlanResponse(rawCompletion);
}

