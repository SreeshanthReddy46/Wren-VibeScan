import { dispatchScanJob, getScanRecord } from "../../../lib/scan-dispatcher.ts";
import type { ApiScanRequest, ScanConfig } from "@wren/shared-types";

export const dynamic = "force-dynamic";

export async function GET() {
  // Return placeholder or recent scan
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
      repoName?: string;
      branch?: string;
      commitHash?: string;
      config?: ScanConfig;
      externalReport?: ApiScanRequest;
    };

    // Dispatch scan job to Inngest / background worker immediately
    const jobResponse = await dispatchScanJob({
      scanId: body.scanId,
      targetPath: body.path || process.cwd(),
      repoName: body.repoName,
      branch: body.branch,
      commitHash: body.commitHash,
      config: body.config,
      externalReport: body.externalReport,
    });

    return Response.json(jobResponse, { status: 202 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to queue scan" },
      { status: 500 }
    );
  }
}
