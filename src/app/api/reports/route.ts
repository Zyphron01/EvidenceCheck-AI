import { listRecentReports } from "@/lib/db/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listRecentReports(20);
    return Response.json({
      success: true,
      data,
    });
  } catch (err: unknown) {
    return Response.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to list reports.",
        },
      },
      { status: 500 }
    );
  }
}

