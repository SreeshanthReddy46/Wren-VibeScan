import Anthropic from "@anthropic-ai/sdk";
import * as path from "path";
import type { Finding } from "@wren/shared-types";
import { AGENT_TOOL_DEFINITIONS, executeAgentTool } from "./agent-tools";

export interface AgentTraceStepRow {
  step_number: number;
  tool_called: string | null;
  tool_input: string | null;
  tool_output: string | null;
  reasoning: string;
  created_at?: string;
}

export interface AgentLoopOptions {
  targetPath?: string;
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  maxTurns?: number;
  scanId?: string;
  injectedClient?: any;
}

export interface AgentLoopResult {
  finding: Finding | null;
  traces: AgentTraceStepRow[];
  verdict: "TRUE_POSITIVE" | "FALSE_POSITIVE" | "NEEDS_MANUAL_REVIEW";
  confidence: number;
  reasoning: string;
}

export async function runDeepReasoningLoop(
  finding: Finding,
  options: AgentLoopOptions = {}
): Promise<AgentLoopResult> {
  const model = options.model || "claude-3-5-sonnet-20241022";
  const maxTurns = options.maxTurns ?? 5;
  const targetPath = path.resolve(options.targetPath || ".");
  const apiKey =
    options.apiKey || process.env.ANTHROPIC_API_KEY || process.env.WREN_LLM_KEY;

  let client: any = options.injectedClient;
  if (!client) {
    if (!apiKey) {
      return {
        finding,
        traces: [],
        verdict: "TRUE_POSITIVE",
        confidence: 0.5,
        reasoning: "Anthropic API key not provided for deep reasoning",
      };
    }
    client = new Anthropic({
      apiKey,
      baseURL: options.apiUrl || undefined,
    });
  }

  const systemPrompt =
    "Investigate before concluding. Use tools if you need more context. Only finalize once you're confident.";

  const initialPrompt = `Investigate this potential security vulnerability:
- Rule: ${finding.ruleId} (${finding.category})
- Severity: ${finding.severity}
- Title: ${finding.title}
- Message: ${finding.message}
- File: ${finding.location.filePath}:${finding.location.startLine}-${finding.location.endLine}
- Snippet:
${finding.location.snippet || "(no snippet provided)"}
- Initial Explanation: ${finding.plainEnglishExplanation}

Use the available tools (read_file, search_codebase, get_call_sites) to inspect callers, sanitizers, wrappers, or middleware.
When you are confident in your conclusion, output your final verdict in this JSON format:
{
  "verdict": "TRUE_POSITIVE" | "FALSE_POSITIVE",
  "confidence": 0.0 - 1.0,
  "explanation": "Detailed explanation of your investigation and findings",
  "suggestedFix": "Optional recommended fix"
}`;

  const tools = AGENT_TOOL_DEFINITIONS.map((def) => ({
    name: def.name,
    description: def.description,
    input_schema: def.input_schema,
  }));

  const messages: any[] = [{ role: "user", content: initialPrompt }];
  const traces: AgentTraceStepRow[] = [];
  let toolCallCount = 0;

  try {
    while (toolCallCount < maxTurns) {
      const response = await client.messages.create({
        model,
        max_tokens: 1500,
        system: systemPrompt,
        tools,
        messages,
      });

      const content = Array.isArray(response.content) ? response.content : [];
      const toolUseBlocks = content.filter((b: any) => b.type === "tool_use");
      const textBlocks = content.filter((b: any) => b.type === "text");
      const statedReasoning = textBlocks
        .map((b: any) => b.text)
        .join("\n")
        .trim();

      if (toolUseBlocks.length === 0) {
        traces.push({
          step_number: traces.length + 1,
          tool_called: null,
          tool_input: null,
          tool_output: null,
          reasoning: statedReasoning || "Investigation finalized.",
          created_at: new Date().toISOString(),
        });

        let verdict: "TRUE_POSITIVE" | "FALSE_POSITIVE" | "NEEDS_MANUAL_REVIEW" =
          "TRUE_POSITIVE";
        let confidence = 0.85;
        let explanation = statedReasoning;
        let suggestedFix = finding.fix?.replacementCode;

        const jsonMatch = statedReasoning.match(/\{[\s\S]*"verdict"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (
              parsed.verdict === "FALSE_POSITIVE" ||
              parsed.verdict === "TRUE_POSITIVE"
            ) {
              verdict = parsed.verdict;
            }
            if (typeof parsed.confidence === "number") {
              confidence = parsed.confidence;
            }
            if (parsed.explanation) {
              explanation = parsed.explanation;
            }
            if (parsed.suggestedFix) {
              suggestedFix = parsed.suggestedFix;
            }
          } catch {}
        } else {
          if (/\bFALSE_POSITIVE\b/i.test(statedReasoning)) {
            verdict = "FALSE_POSITIVE";
          } else if (/\bTRUE_POSITIVE\b/i.test(statedReasoning)) {
            verdict = "TRUE_POSITIVE";
          }
        }

        if (verdict === "FALSE_POSITIVE") {
          return {
            finding: null,
            traces,
            verdict,
            confidence,
            reasoning: explanation,
          };
        }

        const updatedFinding: Finding = {
          ...finding,
          plainEnglishExplanation:
            explanation || finding.plainEnglishExplanation,
          fix: suggestedFix
            ? {
                ...finding.fix,
                replacementCode: suggestedFix,
              }
            : finding.fix,
        };

        return {
          finding: updatedFinding,
          traces,
          verdict,
          confidence,
          reasoning: explanation,
        };
      }

      messages.push({ role: "assistant", content });

      const toolResults: any[] = [];
      for (const toolUse of toolUseBlocks) {
        toolCallCount++;

        const toolOutput = executeAgentTool(
          toolUse.name,
          toolUse.input || {},
          targetPath
        );

        traces.push({
          step_number: traces.length + 1,
          tool_called: toolUse.name,
          tool_input: JSON.stringify(toolUse.input || {}),
          tool_output: toolOutput,
          reasoning:
            statedReasoning ||
            `Investigating contextual code using ${toolUse.name}`,
          created_at: new Date().toISOString(),
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: toolOutput,
        });

        if (toolCallCount >= maxTurns) {
          break;
        }
      }

      messages.push({ role: "user", content: toolResults });
    }

    traces.push({
      step_number: traces.length + 1,
      tool_called: null,
      tool_input: null,
      tool_output: null,
      reasoning:
        "Investigation budget reached (5 tool calls max). Marked for manual review.",
      created_at: new Date().toISOString(),
    });

    const manualReviewFinding: Finding = {
      ...finding,
      plainEnglishExplanation: `${finding.plainEnglishExplanation}\n\n[Needs Manual Review: Investigation budget reached without automated conclusion]`,
    };

    return {
      finding: manualReviewFinding,
      traces,
      verdict: "NEEDS_MANUAL_REVIEW",
      confidence: 0.5,
      reasoning:
        "Investigation budget reached (5 tool calls max). Marked for manual review.",
    };
  } catch (err: any) {
    traces.push({
      step_number: traces.length + 1,
      tool_called: null,
      tool_input: null,
      tool_output: null,
      reasoning: `Investigation failed: ${err.message || String(err)}`,
      created_at: new Date().toISOString(),
    });

    return {
      finding,
      traces,
      verdict: "TRUE_POSITIVE",
      confidence: 0.5,
      reasoning: `Investigation aborted due to error: ${err.message || String(err)}`,
    };
  }
}
