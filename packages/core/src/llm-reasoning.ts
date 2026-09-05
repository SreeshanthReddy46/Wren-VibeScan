import type { Finding } from "@wren/shared-types";
import { runAgentLoop } from "./agent/loop";

export interface LlmEnrichmentOptions {
  apiKey?: string;
  apiUrl?: string;
  targetPath?: string;
  model?: string;
  maxToolTurns?: number;
  timeoutMs?: number;
}

/**
 * Enriches findings using the autonomous 4-stage Agent Loop
 * (Planner -> Investigator -> Verifier -> Reporter) with native codebase tool-use.
 * Implements a strict Circuit Breaker: if no API key is provided, or if the
 * network request fails or times out, it gracefully falls back to static findings
 * without failing the scan.
 */
export async function enrichFindingsWithLlm(
  findings: Finding[],
  options: LlmEnrichmentOptions = {}
): Promise<{ findings: Finding[]; llmApplied: boolean }> {
  return runAgentLoop(findings, {
    targetPath: options.targetPath || ".",
    apiKey: options.apiKey,
    apiUrl: options.apiUrl,
    model: options.model,
    maxToolTurns: options.maxToolTurns,
    timeoutMs: options.timeoutMs,
  });
}
