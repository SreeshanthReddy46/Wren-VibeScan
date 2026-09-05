import { inngest } from "../client";
import { runScan } from "@wren/core";
import {
  recordScanEvent,
  updateScanStatus,
  saveScanFindings,
} from "../../lib/scan-dispatcher";
import type { Finding } from "@wren/shared-types";

export const executeScanFunction = inngest.createFunction(
  {
    id: "execute-scan",
    name: "Execute Vulnerability Scan",
    triggers: [{ event: "scan.requested" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { scanId, targetPath, config } = event.data;

    await step.run("mark-started", async () => {
      await updateScanStatus(scanId, "running", { progressStage: "discovering" });
      await recordScanEvent({
        id: `evt-${Date.now()}-start`,
        scanId,
        eventType: "scan.started",
        stage: "init",
        message: "Scan initiated via Inngest worker",
        timestamp: new Date().toISOString(),
      });
    });

    const scanResult = await step.run("run-agent-scan", async () => {
      await updateScanStatus(scanId, "running", { progressStage: "agent" });
      const result = await runScan({
        targetPath: targetPath || process.cwd(),
        enableLlmReasoning: true,
        ...config,
      });
      return result;
    });

    await step.run("record-findings-and-complete", async () => {
      const findings = scanResult.findings as Finding[];
      for (let i = 0; i < findings.length; i++) {
        const finding = findings[i];
        await recordScanEvent({
          id: `evt-${Date.now()}-${finding.id}`,
          scanId,
          eventType: finding.isAiGeneratedPattern ? "finding.verified" : "finding.discovered",
          stage: "agent",
          stepIndex: i + 1,
          message: `Identified finding: ${finding.title}`,
          payload: { finding: finding as unknown as Record<string, unknown> },
          timestamp: new Date().toISOString(),
        });
      }

      await saveScanFindings(scanId, findings);
      await updateScanStatus(scanId, "completed", {
        progressStage: "completed",
        findingsCount: findings.length,
        criticalCount: scanResult.summary.critical,
        highCount: scanResult.summary.high,
        mediumCount: scanResult.summary.medium,
        lowCount: scanResult.summary.low,
        durationMs: scanResult.summary.scanDurationMs,
      });

      await recordScanEvent({
        id: `evt-${Date.now()}-complete`,
        scanId,
        eventType: "scan.completed",
        stage: "completed",
        message: "Scan completed successfully",
        payload: { summary: scanResult.summary as unknown as Record<string, unknown> },
        timestamp: new Date().toISOString(),
      });
    });

    return { scanId, status: "completed" };
  }
);
