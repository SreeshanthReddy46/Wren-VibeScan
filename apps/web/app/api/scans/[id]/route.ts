import { getScanRecord, getScanFindings, getScanEvents } from "../../../../lib/scan-dispatcher.ts";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const scan = await getScanRecord(id);

    if (!scan) {
      return Response.json({ error: `Scan '${id}' not found` }, { status: 404 });
    }

    const authHeader = request.headers.get("authorization") || "";
    const requestingUserId =
      request.headers.get("x-user-id") ||
      (authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null);

    if (scan.userId && requestingUserId && scan.userId !== requestingUserId) {
      return Response.json(
        { error: "Forbidden: Access denied to scan owned by another user" },
        { status: 403 }
      );
    }

    const findings = await getScanFindings(id);
    const events = await getScanEvents(id);

    return Response.json({
      scan,
      findings,
      events,
    }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch scan" },
      { status: 500 }
    );
  }
}
