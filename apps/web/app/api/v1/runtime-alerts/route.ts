import {
  getRuntimeAlerts,
  updateRuntimeAlertStatus,
} from "../../../../lib/runtime-dispatcher.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const alerts = await getRuntimeAlerts(limit, agentId, status);

    return Response.json({ alerts }, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve runtime alerts",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (!body.alertId || typeof body.alertId !== "string") {
      return Response.json(
        { error: "Missing required field: alertId (string)" },
        { status: 400 }
      );
    }

    if (
      !body.status ||
      !["active", "acknowledged", "resolved"].includes(body.status)
    ) {
      return Response.json(
        {
          error:
            "Invalid status. Must be 'active', 'acknowledged', or 'resolved'",
        },
        { status: 400 }
      );
    }

    const updated = await updateRuntimeAlertStatus(body.alertId, body.status);

    if (!updated) {
      return Response.json(
        { error: `Alert '${body.alertId}' not found` },
        { status: 404 }
      );
    }

    return Response.json({ success: true, alert: updated }, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update alert status",
      },
      { status: 500 }
    );
  }
}
