import {
  ingestCustomerAgentEvent,
  getRuntimeAgentEvents,
} from "../../../../lib/runtime-dispatcher.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return Response.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    if (!body.agentId || typeof body.agentId !== "string") {
      return Response.json(
        { error: "Missing required field: agentId (string)" },
        { status: 400 }
      );
    }

    if (!body.action || typeof body.action !== "string") {
      return Response.json(
        { error: "Missing required field: action (string)" },
        { status: 400 }
      );
    }

    const result = await ingestCustomerAgentEvent(body);

    return Response.json(
      {
        success: true,
        eventId: result.eventId,
        status: result.status,
        tripped: result.tripped,
        alertCount: result.alertCount,
      },
      { status: 202 }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to ingest runtime agent event",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);

    const events = await getRuntimeAgentEvents(limit, agentId);

    return Response.json({ events }, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve agent events",
      },
      { status: 500 }
    );
  }
}
