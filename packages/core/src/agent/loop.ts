import Anthropic from "@anthropic-ai/sdk";
import type { Finding } from "@wren/shared-types";
import type { AgentScanConfig, VerificationResult } from "./types";
import { planInvestigation } from "./planner";
import { createCodebaseTools } from "./tools";
import { investigateFinding } from "./investigator";
import { verifyInvestigation } from "./verifier";
import { synthesizeFindings } from "./reporter";

export async function runAgentLoop(
  findings: Finding[],
  config: AgentScanConfig,
  injectedClient?: Anthropic
): Promise<{ findings: Finding[]; llmApplied: boolean }> {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.WREN_LLM_KEY;

  // Circuit breaker: offline or unauthenticated fallback
  if (!apiKey || findings.length === 0) {
    return { findings, llmApplied: false };
  }

  try {
    // 1. Planner: triage findings requiring deep contextual investigation
    config.onProgress?.({
      stage: "planner",
      message: `Triaging ${findings.length} findings for deep contextual investigation`,
    });

    const plannerResult = planInvestigation(findings);
    const { investigationQueue } = plannerResult;

    if (investigationQueue.length === 0) {
      return { findings, llmApplied: false };
    }

    // 2. Setup sandboxed codebase tools
    const tools = createCodebaseTools(config.targetPath || ".");
    const verifications = new Map<string, VerificationResult>();

    // 3. Investigator & Verifier loop per finding
    for (const finding of investigationQueue) {
      // Phase 2: Investigator (native tool-use loop)
      const investigation = await investigateFinding(
        finding,
        tools,
        config,
        injectedClient
      );

      // Phase 3: Verifier (hypothesis testing against accumulated evidence)
      const verification = await verifyInvestigation(
        finding,
        investigation,
        config,
        injectedClient
      );

      verifications.set(finding.id, verification);
    }

    // 4. Reporter: synthesize findings, eliminate false positives, enrich confirmed findings
    config.onProgress?.({
      stage: "reporter",
      message: "Synthesizing and finalizing enriched findings report",
    });

    const finalizedFindings = synthesizeFindings(findings, verifications);

    return {
      findings: finalizedFindings,
      llmApplied: true,
    };
  } catch {
    // Circuit breaker: catch any unhandled network or execution error and return static findings
    return {
      findings,
      llmApplied: false,
    };
  }
}
