import Anthropic from "@anthropic-ai/sdk";
import type { Finding } from "@wren/shared-types";
import type {
  AgentScanConfig,
  CodebaseTools,
  InvestigationResult,
  InvestigationStep,
  ToolCallRequest,
  ToolCallResult,
} from "./types.ts";
import { DEFAULT_AGENT_CONFIG } from "./types.ts";

export async function investigateFinding(
  finding: Finding,
  tools: CodebaseTools,
  config: AgentScanConfig,
  injectedClient?: Anthropic
): Promise<InvestigationResult> {
  const model = config.model || DEFAULT_AGENT_CONFIG.model;
  const maxTurns = config.maxToolTurns ?? DEFAULT_AGENT_CONFIG.maxToolTurns;
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.WREN_LLM_KEY;

  let client: Anthropic;
  if (injectedClient) {
    client = injectedClient;
  } else {
    if (!apiKey) {
      return {
        findingId: finding.id,
        steps: [],
        gatheredContext: [],
        completed: false,
        error: "Missing Anthropic API key for investigator",
      };
    }
    client = new Anthropic({
      apiKey,
      baseURL: config.apiUrl || undefined,
    });
  }

  const systemPrompt = `You are an expert security investigator for Wren VibeScan.
You are investigating a suspected vulnerability in an AI-generated codebase.
Your goal is to inspect related files (such as middleware, router guards, wrappers, or validators) using the provided tools to determine if the vulnerability is a true positive or a mitigated false positive.
Keep tool requests concise and focused.`;

  const initialPrompt = `Investigate this flagged finding:
- Rule: ${finding.ruleId} (${finding.category})
- Severity: ${finding.severity}
- Title: ${finding.title}
- Message: ${finding.message}
- Location: ${finding.location.filePath}:${finding.location.startLine}-${finding.location.endLine}
- Explanation: ${finding.plainEnglishExplanation}

Inspect the surrounding code, callers, or middleware to verify whether this vulnerability actually manifests or is mitigated.`;

  const messages: any[] = [{ role: "user", content: initialPrompt }];
  const steps: InvestigationStep[] = [];
  const gatheredContext: string[] = [];

  const anthropicTools = tools.definitions.map((def) => ({
    name: def.name,
    description: def.description,
    input_schema: def.input_schema,
  }));

  let turn = 0;

  try {
    while (turn < maxTurns) {
      turn++;
      config.onProgress?.({
        stage: "investigator",
        findingId: finding.id,
        message: `Turn ${turn}/${maxTurns}: Analyzing and checking context`,
      });

      const response: any = await client.messages.create({
        model,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools: anthropicTools as any,
      });

      const responseContent = response.content || [];
      const toolUseBlocks = responseContent.filter((c: any) => c.type === "tool_use");
      const textBlocks = responseContent.filter((c: any) => c.type === "text");
      const thoughtText = textBlocks.map((t: any) => t.text).join("\n").trim();

      if (thoughtText) {
        gatheredContext.push(thoughtText);
      }

      if (response.stop_reason === "tool_use" && toolUseBlocks.length > 0) {
        messages.push({ role: "assistant", content: responseContent });

        const toolResultBlocks: any[] = [];

        for (const block of toolUseBlocks) {
          const toolCall: ToolCallRequest = {
            toolName: block.name,
            args: (block.input as Record<string, unknown>) || {},
          };

          const toolResult: ToolCallResult = await tools.execute(toolCall);

          steps.push({
            turn,
            thought: thoughtText || undefined,
            toolCall,
            toolResult,
          });

          if (toolResult.success && toolResult.content) {
            gatheredContext.push(`[${block.name}] ${toolResult.content}`);
          }

          toolResultBlocks.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: toolResult.success
              ? toolResult.content
              : `Error: ${toolResult.error || "Tool failed"}`,
          });
        }

        messages.push({ role: "user", content: toolResultBlocks });
      } else {
        // End of investigation turn
        steps.push({
          turn,
          thought: thoughtText || undefined,
        });
        break;
      }
    }

    return {
      findingId: finding.id,
      steps,
      gatheredContext,
      completed: true,
    };
  } catch (err) {
    return {
      findingId: finding.id,
      steps,
      gatheredContext,
      completed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
