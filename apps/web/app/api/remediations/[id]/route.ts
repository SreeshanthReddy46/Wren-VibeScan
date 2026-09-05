import { getRemediationRecord } from "../../../../lib/remediation-dispatcher.ts";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const remediation = await getRemediationRecord(id);

    if (!remediation) {
      return Response.json({ error: `Remediation '${id}' not found` }, { status: 404 });
    }

    return Response.json({ remediation }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch remediation" },
      { status: 500 }
    );
  }
}
