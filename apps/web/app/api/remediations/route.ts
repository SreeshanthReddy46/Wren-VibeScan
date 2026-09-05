import { dispatchRemediationJob } from "../../../lib/remediation-dispatcher.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      scanId: string;
      findingId: string;
      repoName?: string;
      branch?: string;
      targetPath?: string;
    };

    if (!body.scanId || !body.findingId) {
      return Response.json(
        { error: "scanId and findingId are required" },
        { status: 400 }
      );
    }

    const job = await dispatchRemediationJob({
      scanId: body.scanId,
      findingId: body.findingId,
      repoName: body.repoName,
      branch: body.branch,
      targetPath: body.targetPath,
    });

    return Response.json(job, { status: 202 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to queue remediation" },
      { status: 500 }
    );
  }
}
