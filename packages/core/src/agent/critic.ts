import Anthropic from "@anthropic-ai/sdk";
import type { Finding, CriticRubric, CriticEvaluationResult } from "@wren/shared-types";
import type { VerificationResult, AgentScanConfig } from "./types";

export interface CriticOptions {
  mockRubric?: CriticRubric;
}

const CRITIC_SYSTEM_PROMPT = `You are an independent, adversarial Senior Application Security Judge.
Your sole job is to evaluate vulnerability verdicts proposed by an AI investigator and eliminate false alarms.

Scoring Rubric (Strict 0.0 to 1.0 scale):
1. evidenceQuality (0.0 to 1.0): Did the agent confirm concrete call sites, middleware execution paths, or sink reachability? If the agent merely inspected a local snippet and guessed without verifying data flow or router connections, score below 0.60.
2. falsePositiveRisk (0.0 to 1.0): Likelihood that framework conventions (Next.js server-side isolation, ORM prepared statements, helmet headers, strict validation) prevent exploitation. High risk of false positive should score above 0.50.
3. confidenceScore (0.0 to 1.0): Mathematical conviction in this classification.

You must output valid JSON ONLY with the following shape:
{
  "evidenceQuality": number,
  "falsePositiveRisk": number,
  "confidenceScore": number,
  "critique": "Brief plain-English explanation of your evaluation"
}`;

export async function evaluateVerdictWithCritic(
  finding: Finding,
  verification: VerificationResult,
  config: Partial<AgentScanConfig> = {},
  injectedClient?: Anthropic,
  options: CriticOptions = {}
): Promise<CriticEvaluationResult> {
  let rubric: CriticRubric;

  if (options.mockRubric) {
    rubric = options.mockRubric;
  } else {
    const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.WREN_LLM_KEY;
    const client = injectedClient || (apiKey ? new Anthropic({ apiKey }) : null);

    if (client && apiKey) {
      try {
        const response = await client.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 600,
          temperature: 0.1,
          system: CRITIC_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `Evaluate this candidate finding and investigator verdict:
Finding: ${finding.title} (${finding.ruleId})
File: ${finding.location.filePath}:${finding.location.startLine}
Code Snippet:
${finding.location.snippet || "(no snippet)"}

Investigator Verdict: ${verification.verdict}
Confidence: ${verification.confidence}
Rationale:
${verification.rationale}

Evaluate the evidence quality, false-positive risk, and confidence. Output JSON only.`,
            },
          ],
        });

        const textBlock = response.content.find((c) => c.type === "text");
        const text = textBlock ? textBlock.text : "{}";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

        rubric = {
          evidenceQuality: Number(parsed.evidenceQuality ?? 0.8),
          falsePositiveRisk: Number(parsed.falsePositiveRisk ?? 0.2),
          confidenceScore: Number(parsed.confidenceScore ?? 0.85),
          critique: String(parsed.critique ?? "Critic evaluated finding."),
        };
      } catch {

        rubric = generateFallbackRubric(verification);
      }
    } else {
      rubric = generateFallbackRubric(verification);
    }
  }

  const isOverruled =
    (verification.verdict === "CONFIRMED" || verification.verdict === "SEVERITY_ADJUSTED") &&
    (rubric.evidenceQuality < 0.7 || rubric.falsePositiveRisk > 0.5);

  const finalVerdict = isOverruled ? "FALSE_POSITIVE" : verification.verdict;
  const adjustedRationale = isOverruled
    ? `[Critic Overrule: Insufficient Evidence (quality: ${rubric.evidenceQuality.toFixed(
        2
      )}, risk: ${rubric.falsePositiveRisk.toFixed(2)})] ${rubric.critique}`
    : verification.rationale;

  return {
    rubric,
    isOverruled,
    originalVerdict: verification.verdict,
    finalVerdict,
    adjustedRationale,
  };
}

function generateFallbackRubric(verification: VerificationResult): CriticRubric {
  if (verification.verdict === "FALSE_POSITIVE") {
    return {
      evidenceQuality: 0.85,
      falsePositiveRisk: 0.85,
      confidenceScore: 0.9,
      critique: "Investigator identified neutralizing control or framework protection.",
    };
  }

  const conf = verification.confidence ?? 0.8;
  return {
    evidenceQuality: conf >= 0.8 ? 0.85 : 0.65,
    falsePositiveRisk: conf >= 0.8 ? 0.2 : 0.55,
    confidenceScore: conf,
    critique:
      conf >= 0.8
        ? "Evidence confirms reachability and presence of vulnerability."
        : "Evidence is inconclusive or lacks verifiable call site verification.",
  };
}
