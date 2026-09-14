import type { Finding } from "@wren/shared-types";
import { runDeepReasoningLoop, AgentTraceStepRow } from "./agent-loop";

export interface DeepReasoningOptions {
  targetPath?: string;
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  maxTurns?: number;
  injectedClient?: any;
  confidenceThreshold?: number;
  enableCritic?: boolean;
  timeoutMs?: number;
}

export interface DeepReasoningResult {
  findings: Finding[];
  llmApplied: boolean;
  traces: AgentTraceStepRow[];
  llmReasoningNote?: string;
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
      llmReasoningNote: "LLM reasoning unavailable, showing pattern-based findings only",
    };
  }

  const enrichedFindings: Finding[] = [];
  const allTraces: AgentTraceStepRow[] = [];
  const timeoutMs = options.timeoutMs || 15000;

  try {
    const loopPromise = (async () => {
      for (const finding of findings) {
        const result = await runDeepReasoningLoop(finding, {
          targetPath: options.targetPath,
          apiKey: options.apiKey,
          apiUrl: options.apiUrl,
          model: options.model,
          maxTurns: options.maxTurns,
          injectedClient: options.injectedClient,
          confidenceThreshold: options.confidenceThreshold,
          enableCritic: options.enableCritic ?? true,
        });

        allTraces.push(...result.traces);

        if (result.finding !== null) {
          enrichedFindings.push(result.finding);
        }
      }
      return { findings: enrichedFindings, traces: allTraces };
    })();

    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<{ findings: Finding[]; traces: AgentTraceStepRow[] }>((_, reject) => {
      timer = setTimeout(() => reject(new Error("LLM reasoning timed out")), timeoutMs);
    });

    const completed = await Promise.race([loopPromise, timeoutPromise]).finally(() => {
      if (timer) clearTimeout(timer);
    });

    return {
      findings: completed.findings,
      llmApplied: true,
      traces: completed.traces,
    };
  } catch {
    return {
      findings,
      llmApplied: false,
      traces: allTraces,
      llmReasoningNote: "LLM reasoning unavailable, showing pattern-based findings only",
    };
  }
}
