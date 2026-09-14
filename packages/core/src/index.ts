import type { Finding, ScanConfig, ScanResult, ScanSummary, Severity } from "@wren/shared-types";
import { discoverFiles } from "./file-discovery";
import { runStaticScan } from "./static-scan";
import { runAstScan } from "./ast-scan";
import { enrichFindingsWithLlm } from "./llm-reasoning";
import * as path from "path";

export * from "./file-discovery";
export * from "./static-scan";
export * from "./ast-scan";
export * from "./llm-reasoning";
export * from "./agent/types";
export * from "./agent/loop";
export * from "./agent/tools";
export * from "./agent/planner";
export * from "./agent/investigator";
export * from "./agent/verifier";
export * from "./agent/critic";
export * from "./agent/reporter";
export * from "./agent/tracer";
export * from "./memory/types";
export * from "./memory/hash";
export * from "./memory/anonymizer";
export * from "./memory/embeddings";
export * from "./memory/store";
export * from "./remediation/syntax-validator";
export * from "./remediation/patch-generator";
export * from "./runtime/webhook-signer";
export * from "./runtime/types";
export * from "./runtime/rules";
export * from "./runtime/engine";
export * from "./eval/types";
export * from "./eval/dataset";
export * from "./eval/metrics";
export * from "./eval/runner";

export async function runScan(config: ScanConfig = {}): Promise<ScanResult> {
  const startTime = Date.now();
  const targetDir = path.resolve(config.targetPath || process.cwd());

  const files = discoverFiles(targetDir, config.ignorePaths || []);

  const staticFindings = runStaticScan(files);

  const astFindings = runAstScan(files);

  let allFindings: Finding[] = [...staticFindings, ...astFindings];

  if (config.ignoreRules && config.ignoreRules.length > 0) {
    const ignoredSet = new Set(config.ignoreRules);
    allFindings = allFindings.filter((f) => !ignoredSet.has(f.ruleId));
  }

  let llmApplied = false;
  let llmReasoningNote: string | undefined;

  if (config.enableLlmReasoning) {
    const timeoutMs = config.llmTimeoutMs || 15000;
    try {
      const llmPromise = enrichFindingsWithLlm(allFindings, {
        apiKey: config.apiKey,
        apiUrl: config.apiUrl,
        targetPath: targetDir,
        timeoutMs,
      });

      let timer: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<{ findings: Finding[]; llmApplied: boolean }>((_, reject) => {
        timer = setTimeout(() => reject(new Error("LLM reasoning timed out")), timeoutMs);
      });

      const llmResult = await Promise.race([llmPromise, timeoutPromise]).finally(() => {
        if (timer) clearTimeout(timer);
      });

      allFindings = llmResult.findings;
      llmApplied = llmResult.llmApplied;

      if (!llmApplied) {
        llmReasoningNote = "LLM reasoning unavailable, showing pattern-based findings only";
      }
    } catch {
      llmApplied = false;
      llmReasoningNote = "LLM reasoning unavailable, showing pattern-based findings only";
    }
  }

  const severityRank: Record<Severity, number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1,
  };

  allFindings.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  const durationMs = Date.now() - startTime;
  const summary: ScanSummary = {
    totalFindings: allFindings.length,
    critical: allFindings.filter((f) => f.severity === "critical").length,
    high: allFindings.filter((f) => f.severity === "high").length,
    medium: allFindings.filter((f) => f.severity === "medium").length,
    low: allFindings.filter((f) => f.severity === "low").length,
    info: allFindings.filter((f) => f.severity === "info").length,
    filesScanned: files.length,
    scanDurationMs: durationMs,
    completedAt: new Date().toISOString(),
  };

  return {
    scanId: `scan-${Date.now().toString(36)}`,
    targetPath: targetDir,
    timestamp: summary.completedAt,
    summary,
    findings: allFindings,
    engineVersion: "1.0.0",
    llmReasoningApplied: llmApplied,
    ...(llmReasoningNote ? { llmReasoningNote } : {}),
  };
}
