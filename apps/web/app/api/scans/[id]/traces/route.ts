import {
  recordAgentTrace,
  recordAgentTraceBatch,
  getAgentTracesByScanId,
  summarizeCriticRubrics,
} from "../../../../../lib/trace-dispatcher.ts";
import type { AgentTraceRecord } from "@wren/shared-types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const findingId = url.searchParams.get("findingId") || undefined;

    const traces = await getAgentTracesByScanId(id, findingId);
    const summary = summarizeCriticRubrics(traces);

    return Response.json(
      {
        traces,
        summary,
        criticCount: summary.criticCount,
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch traces" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    let count = 0;
    if (Array.isArray(body.traces)) {
      count = await recordAgentTraceBatch(id, body.traces);
    } else if (body.trace) {
      await recordAgentTrace(id, body.trace);
      count = 1;
    } else if (Array.isArray(body)) {
      count = await recordAgentTraceBatch(id, body as AgentTraceRecord[]);
    } else {
      await recordAgentTrace(id, body as AgentTraceRecord);
      count = 1;
    }

    return Response.json(
      {
        success: true,
        count,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to record traces" },
      { status: 500 }
    );
  }
}
