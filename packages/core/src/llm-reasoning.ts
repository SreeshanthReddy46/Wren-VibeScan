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
