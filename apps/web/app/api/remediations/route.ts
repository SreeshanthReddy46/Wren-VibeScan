import { dispatchRemediationJob } from "../../../lib/remediation-dispatcher.ts";
import { checkRateLimit, getClientIdentifier } from "../../../lib/rate-limiter.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, "llm");

    if (!rateLimit.allowed) {
      return Response.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimit.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSec),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        }
      );
    }

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

    return Response.json(job, {
      status: 202,
      headers: {
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to queue remediation" },
      { status: 500 }
    );
  }
}
