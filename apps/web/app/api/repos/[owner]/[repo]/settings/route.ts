import {
  getRepoSettings,
  updateRepoSettings,
} from "../../../../../../lib/remediation-dispatcher.ts";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await context.params;
    const repoName = `${owner}/${repo}`;
    const settings = await getRepoSettings(repoName);
    return Response.json(settings, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await context.params;
    const repoName = `${owner}/${repo}`;
    const body = (await request.json()) as {
      autoRemediateEnabled?: boolean;
      minSeverity?: "critical" | "high";
      installationId?: number;
    };

    const updated = await updateRepoSettings(repoName, body);
    return Response.json(updated, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 500 }
    );
  }
}
