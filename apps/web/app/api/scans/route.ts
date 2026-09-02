import { NextResponse } from "next/server";
import { runScan } from "@wren/core";
import type { ApiScanRequest, ApiScanResponse, ScanConfig } from "@wren/shared-types";

export const dynamic = "force-dynamic";

export async function GET() {
  // Return recent scans
  return NextResponse.json({
    scans: [
      {
        id: "scan-prod-001",
        repo: "user/vibe-shop",
        branch: "main",
        status: "completed",
        findingsCount: 3,
        critical: 1,
        high: 1,
        medium: 1,
        completedAt: new Date().toISOString(),
      },
    ],
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      path?: string;
      config?: ScanConfig;
      externalReport?: ApiScanRequest;
    };

    if (body.externalReport) {
      // CLI reporting to cloud
      const scanId = `scan-${Date.now().toString(36)}`;
      const response: ApiScanResponse = {
        success: true,
        scanId,
        dashboardUrl: `/scans/${scanId}`,
      };
      return NextResponse.json(response, { status: 201 });
    }

    // Run in-process scan using @wren/core
    const result = await runScan({
      targetPath: body.path || process.cwd(),
      ...body.config,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute scan" },
      { status: 500 }
    );
  }
}
