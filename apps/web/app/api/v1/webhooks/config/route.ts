import {
  getRuntimeWebhookConfig,
  saveRuntimeWebhookConfig,
} from "../../../../../lib/runtime-dispatcher.ts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") || "default";

    const config = await getRuntimeWebhookConfig(projectId);

    return Response.json({ config }, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve webhook config",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return Response.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    if (body.url !== undefined && typeof body.url !== "string") {
      return Response.json(
        { error: "Field 'url' must be a valid string URL" },
        { status: 400 }
      );
    }

    const projectId = body.projectId || "default";
    const config = await saveRuntimeWebhookConfig(
      {
        url: body.url || "",
        enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
        minSeverity: body.minSeverity || "high",
        secret: body.secret,
      },
      projectId
    );

    return Response.json({ success: true, config }, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save webhook config",
      },
      { status: 500 }
    );
  }
}
