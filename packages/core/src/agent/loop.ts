import Anthropic from "@anthropic-ai/sdk";
import type { Finding, AgentTraceRecord } from "@wren/shared-types";
import type { AgentScanConfig, VerificationResult, VerdictStatus } from "./types";
import { planInvestigation } from "./planner";
import { createCodebaseTools } from "./tools";
import { investigateFinding } from "./investigator";
import { verifyInvestigation } from "./verifier";
import { evaluateVerdictWithCritic } from "./critic";
import { synthesizeFindings } from "./reporter";
import { AgentTracer } from "./tracer";

export async function runAgentLoop(
  findings: Finding[],
  config: AgentScanConfig,
  injectedClient?: Anthropic
): Promise<{ findings: Finding[]; traces: AgentTraceRecord[]; llmApplied: boolean }> {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.WREN_LLM_KEY;
  const scanId = config.scanId || `scan-${Date.now().toString(36)}`;
  const tracer = new AgentTracer(scanId);

  // Circuit breaker: offline or unauthenticated fallback
  if (!apiKey || findings.length === 0) {
    return { findings, traces: [], llmApplied: false };
  }

  try {
    // 1. Planner: triage findings requiring deep contextual investigation
    config.onProgress?.({
      stage: "planner",
      message: `Triaging ${findings.length} findings for deep contextual investigation`,
    });

    const plannerSpan = tracer.startSpan("planner", undefined, { totalFindings: findings.length });
    const plannerResult = planInvestigation(findings);
    const { investigationQueue } = plannerResult;
    tracer.finishSpan(
      plannerSpan,
      { queuedCount: investigationQueue.length },
      `Triaged ${investigationQueue.length} contextual findings for deep investigation`
    );

    if (investigationQueue.length === 0) {
      return { findings, traces: tracer.getTraces(), llmApplied: false };
    }

    // 2. Setup sandboxed codebase tools and memory store
    const tools = createCodebaseTools(config.targetPath || ".");
    const verifications = new Map<string, VerificationResult>();
    const memoryStore = config.memoryStore;

    // 3. Investigator & Verifier loop per finding
    for (const finding of investigationQueue) {
      // Memory check: Tier 1 (Hash) & Tier 2 (pgvector)
      if (memoryStore) {
        try {
          const memoryLookup = await memoryStore.lookup(finding, config.projectId);
          if (
            memoryLookup.hit &&
            (memoryLookup.hitType === "EXACT_HASH" ||
              memoryLookup.hitType === "VECTOR_HIGH_CONFIDENCE") &&
            memoryLookup.match
          ) {
            // High-confidence cache hit! Bypass LLM investigator & verifier completely
            const cached = memoryLookup.match.entry;
            const verifiedHit: VerificationResult = {
              findingId: finding.id,
              verdict: cached.verdict,
              rationale: `[Memory Hit: ${memoryLookup.hitType}] ${cached.rationale}`,
              confidence: cached.confidence,
              adjustedSeverity: cached.adjustedSeverity,
              suggestedFix: cached.suggestedFix,
            };
            verifications.set(finding.id, verifiedHit);

            const memSpan = tracer.startSpan("verifier", finding.id, { cacheHit: memoryLookup.hitType });
            tracer.finishSpan(memSpan, { verdict: cached.verdict }, verifiedHit.rationale, cached.confidence);
            continue;
          }
        } catch {
          // On memory lookup error, proceed with standard agent loop
        }
      }

      // Phase 2: Investigator (native tool-use loop)
      const invSpan = tracer.startSpan("investigator", finding.id, {
        ruleId: finding.ruleId,
        filePath: finding.location.filePath,
      });

      const investigation = await investigateFinding(
        finding,
        tools,
        config,
        injectedClient
      );

      tracer.finishSpan(
        invSpan,
        { turns: investigation.steps.length, completed: investigation.completed },
        `Investigator gathered ${investigation.gatheredContext.length} contextual slices across ${investigation.steps.length} turns`
      );

      // Phase 3: Verifier (hypothesis testing against accumulated evidence)
      const verSpan = tracer.startSpan("verifier", finding.id, {
        findingId: finding.id,
      });

      const verification = await verifyInvestigation(
        finding,
        investigation,
        config,
        injectedClient
      );

      tracer.finishSpan(
        verSpan,
        { verdict: verification.verdict },
        verification.rationale,
        verification.confidence
      );

      // Phase 4: Critic / Judge pass (adversarial rubric evaluation & overrule)
      config.onProgress?.({
        stage: "critic",
        findingId: finding.id,
        message: `Evaluating verdict for ${finding.ruleId} with independent Critic Judge`,
      });

      const criticSpan = tracer.startSpan("critic", finding.id, {
        originalVerdict: verification.verdict,
        confidence: verification.confidence,
      });

      const criticResult = await evaluateVerdictWithCritic(
        finding,
        verification,
        config,
        injectedClient
      );

      if (criticResult.isOverruled) {
        verification.verdict = criticResult.finalVerdict as VerdictStatus;
        verification.rationale = criticResult.adjustedRationale;
      }

      tracer.finishSpan(
        criticSpan,
        {
          finalVerdict: criticResult.finalVerdict,
          isOverruled: criticResult.isOverruled,
        },
        criticResult.rubric.critique,
        criticResult.rubric.confidenceScore,
        criticResult.rubric
      );

      verifications.set(finding.id, verification);

      // Save fresh verdict to memory store
      if (memoryStore) {
        try {
          await memoryStore.save(finding, verification, config.projectId, true);
        } catch {
          // On memory save error, ignore
        }
      }
    }

    // 5. Reporter: synthesize findings, eliminate false positives, enrich confirmed findings
    config.onProgress?.({
      stage: "reporter",
      message: "Synthesizing and finalizing enriched findings report",
    });

    const repSpan = tracer.startSpan("reporter", undefined, {
      totalVerifications: verifications.size,
    });

    const finalizedFindings = synthesizeFindings(findings, verifications);

    tracer.finishSpan(
      repSpan,
      { finalCount: finalizedFindings.length },
      `Filtered false positives and synthesized ${finalizedFindings.length} confirmed findings`
    );

    if (config.targetPath) {
      try {
        tracer.flushToDisk(config.targetPath);
      } catch {
        // Ignore trace flush error on read-only targets
      }
    }

    return {
      findings: finalizedFindings,
      traces: tracer.getTraces(),
      llmApplied: true,
    };
  } catch {
    // Circuit breaker: catch any unhandled network or execution error and return static findings
    return {
      findings,
      traces: tracer.getTraces(),
      llmApplied: false,
    };
  }
}
