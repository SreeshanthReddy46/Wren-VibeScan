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
