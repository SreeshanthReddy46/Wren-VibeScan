import { dispatchScanJob, getScanRecord } from "../../../lib/scan-dispatcher.ts";
import { checkRateLimit, getClientIdentifier } from "../../../lib/rate-limiter.ts";
import type { ApiScanRequest, ScanConfig } from "@wren/shared-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const sampleScan = await getScanRecord("scan-prod-001");
  return Response.json({
    scans: sampleScan ? [sampleScan] : [
      {
        id: "scan-prod-001",
        repoName: "user/vibe-shop",
        branch: "main",
        status: "completed",
        findingsCount: 3,
        criticalCount: 1,
        highCount: 1,
        mediumCount: 1,
        completedAt: new Date().toISOString(),
      },
    ],
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      path?: string;
      scanId?: string;
      userId?: string;
      repoName?: string;
      branch?: string;
      commitHash?: string;
      config?: ScanConfig;
      externalReport?: ApiScanRequest;
    };

    const isLlmTier = body.config?.enableLlmReasoning !== false;
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, isLlmTier ? "llm" : "general");

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

    const authHeader = request.headers.get("authorization") || "";
    const headerUserId =
      request.headers.get("x-user-id") ||
      (authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : undefined);

    const jobResponse = await dispatchScanJob({
      scanId: body.scanId,
      userId: body.userId || headerUserId,
      targetPath: body.path || process.cwd(),
      repoName: body.repoName,
      branch: body.branch,
      commitHash: body.commitHash,
      config: body.config,
      externalReport: body.externalReport,
    });

    return Response.json(jobResponse, {
      status: 202,
      headers: {
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to queue scan" },
      { status: 500 }
    );
  }
}
