import type { Finding } from "@wren/shared-types";
import { runDeepReasoningLoop, AgentTraceStepRow } from "./agent-loop";

export interface DeepReasoningOptions {
  targetPath?: string;
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  maxTurns?: number;
  injectedClient?: any;
}

export interface DeepReasoningResult {
  findings: Finding[];
  llmApplied: boolean;
  traces: AgentTraceStepRow[];
}

export async function enrichFindingsWithDeepReasoning(
  findings: Finding[],
  options: DeepReasoningOptions = {}
): Promise<DeepReasoningResult> {
  const apiKey =
    options.apiKey || process.env.ANTHROPIC_API_KEY || process.env.WREN_LLM_KEY;

  if (!apiKey && !options.injectedClient) {
    return {
      findings,
      llmApplied: false,
      traces: [],
    };
  }

  const enrichedFindings: Finding[] = [];
  const allTraces: AgentTraceStepRow[] = [];

  for (const finding of findings) {
    const result = await runDeepReasoningLoop(finding, {
      targetPath: options.targetPath,
      apiKey: options.apiKey,
      apiUrl: options.apiUrl,
      model: options.model,
      maxTurns: options.maxTurns,
      injectedClient: options.injectedClient,
    });

    allTraces.push(...result.traces);

    if (result.finding !== null) {
      enrichedFindings.push(result.finding);
    }
  }

  return {
    findings: enrichedFindings,
    llmApplied: true,
    traces: allTraces,
  };
}
