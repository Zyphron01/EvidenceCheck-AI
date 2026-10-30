import { getReportById } from "@/lib/db/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || id.trim() === "") {
      return Response.json(
        {
          success: false,
          error: {
            code: "BAD_REQUEST",
            message: "Missing report ID parameter.",
          },
        },
        { status: 400 }
      );
    }

    const result = await getReportById(id.trim());

    if (!result.report) {
      return Response.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: `Report with ID '${id}' was not found in persistent database or verified archives.`,
          },
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: {
        report: result.report,
        source: result.source,
      },
    });
  } catch (err: unknown) {
    return Response.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to retrieve report.",
        },
      },
      { status: 500 }
    );
  }
}

