import { runScan } from "@wren/core";
import type {
  Finding,
  ScanJobRequest,
  ScanJobResponse,
  ScanLifecycleStatus,
  ScanStepEvent,
} from "@wren/shared-types";
import { inngest } from "../inngest/client.ts";

export interface ScanRecord {
  id: string;
  repoName?: string;
  branch?: string;
  commitHash?: string;
  status: ScanLifecycleStatus;
  progressStage?: string;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

const scansStore = new Map<string, ScanRecord>();
const findingsStore = new Map<string, Finding[]>();
const eventsStore = new Map<string, ScanStepEvent[]>();
const eventSubscribers = new Map<string, Set<(event: ScanStepEvent) => void>>();

export async function getScanRecord(scanId: string): Promise<ScanRecord | null> {
  return scansStore.get(scanId) || null;
}

export async function getScanFindings(scanId: string): Promise<Finding[]> {
  return findingsStore.get(scanId) || [];
}

export async function getScanEvents(scanId: string): Promise<ScanStepEvent[]> {
  return eventsStore.get(scanId) || [];
}

export async function updateScanStatus(
  scanId: string,
  status: ScanLifecycleStatus,
  updates: Partial<ScanRecord> = {}
): Promise<void> {
  const existing = scansStore.get(scanId) || {
    id: scanId,
    status: "queued",
    findingsCount: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    createdAt: new Date().toISOString(),
  };

  const updated: ScanRecord = {
    ...existing,
    ...updates,
    status,
    completedAt: status === "completed" || status === "failed" ? new Date().toISOString() : existing.completedAt,
  };

  scansStore.set(scanId, updated);
}

export async function saveScanFindings(scanId: string, findings: Finding[]): Promise<void> {
  findingsStore.set(scanId, findings);
}

export async function recordScanEvent(event: ScanStepEvent): Promise<void> {
  const existing = eventsStore.get(event.scanId) || [];
  existing.push(event);
  eventsStore.set(event.scanId, existing);

  const subs = eventSubscribers.get(event.scanId);
  if (subs) {
    for (const callback of subs) {
      try {
        callback(event);
      } catch (err) {
        console.error(`Error notifying subscriber for scan ${event.scanId}:`, err);
      }
    }
  }
}

export function subscribeToScanEvents(
  scanId: string,
  callback: (event: ScanStepEvent) => void
): () => void {
  if (!eventSubscribers.has(scanId)) {
    eventSubscribers.set(scanId, new Set());
  }
  const subs = eventSubscribers.get(scanId)!;
  subs.add(callback);

  return () => {
    subs.delete(callback);
    if (subs.size === 0) {
      eventSubscribers.delete(scanId);
    }
  };
}

async function runLocalBackgroundScan(
  scanId: string,
  request: ScanJobRequest
): Promise<void> {
  try {
    await updateScanStatus(scanId, "running", { progressStage: "discovering" });
    await recordScanEvent({
      id: `evt-${Date.now()}-start`,
      scanId,
      eventType: "scan.started",
      stage: "init",
      message: "Scan initiated in background",
      timestamp: new Date().toISOString(),
    });

    const targetPath = request.targetPath || process.cwd();
    const config = request.config || {};

    await updateScanStatus(scanId, "running", { progressStage: "agent" });
    const result = await runScan({
      targetPath,
      enableLlmReasoning: config.enableLlmReasoning ?? true,
      ...config,
    });

    for (let i = 0; i < result.findings.length; i++) {
      const f = result.findings[i];
      await recordScanEvent({
        id: `evt-${Date.now()}-${f.id}`,
        scanId,
        eventType: f.isAiGeneratedPattern ? "finding.verified" : "finding.discovered",
        stage: "agent",
        stepIndex: i + 1,
        message: `Identified finding: ${f.title}`,
        payload: { finding: f as unknown as Record<string, unknown> },
        timestamp: new Date().toISOString(),
      });
    }

    await saveScanFindings(scanId, result.findings);

    await updateScanStatus(scanId, "completed", {
      progressStage: "completed",
      findingsCount: result.findings.length,
      criticalCount: result.summary.critical,
      highCount: result.summary.high,
      mediumCount: result.summary.medium,
      lowCount: result.summary.low,
      durationMs: result.summary.scanDurationMs,
    });

    await recordScanEvent({
      id: `evt-${Date.now()}-complete`,
      scanId,
      eventType: "scan.completed",
      stage: "completed",
      message: "Scan completed successfully",
      payload: { summary: result.summary as unknown as Record<string, unknown> },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await updateScanStatus(scanId, "failed", { progressStage: "failed" });
    await recordScanEvent({
      id: `evt-${Date.now()}-fail`,
      scanId,
      eventType: "scan.failed",
      stage: "failed",
      message: errorMsg,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function dispatchScanJob(request: ScanJobRequest): Promise<ScanJobResponse> {
  const scanId =
    request.scanId ||
    `scan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  await updateScanStatus(scanId, "queued", {
    repoName: request.repoName,
    branch: request.branch,
    commitHash: request.commitHash,
    progressStage: "queued",
  });

  const inngestKey = process.env.INNGEST_EVENT_KEY || process.env.INNGEST_SIGNING_KEY;
  const isDevOrTest =
    process.env.NODE_ENV === "test" || !inngestKey || process.env.WREN_LOCAL_WORKER === "1";

  if (!isDevOrTest) {
    try {
      await inngest.send({
        name: "scan.requested",
        data: {
          scanId,
          targetPath: request.targetPath,
          repoName: request.repoName,
          branch: request.branch,
          commitHash: request.commitHash,
          config: request.config,
          externalReport: request.externalReport,
        },
      });
    } catch (inngestErr) {
      console.warn("Failed to dispatch to Inngest, falling back to local runner:", inngestErr);
      setTimeout(() => {
        void runLocalBackgroundScan(scanId, request);
      }, 0);
    }
  } else {

    setTimeout(() => {
      void runLocalBackgroundScan(scanId, request);
    }, 0);
  }

  return {
    success: true,
    scanId,
    status: "queued",
    dashboardUrl: `/scans/${scanId}`,
    message: "Scan job queued successfully",
  };
}
