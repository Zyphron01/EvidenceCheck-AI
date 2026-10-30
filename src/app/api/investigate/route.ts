import { NextRequest } from "next/server";
import { handleInvestigateRequest } from "@/lib/investigation/handler";

// Extend serverless execution budget to accommodate multi-step LLM + dual retrieval (observed 32.5s)
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return handleInvestigateRequest(req);
}

