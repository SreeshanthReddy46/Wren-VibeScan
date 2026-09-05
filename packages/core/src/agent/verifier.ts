import Anthropic from "@anthropic-ai/sdk";
import type { Finding } from "@wren/shared-types";
import type {
  AgentScanConfig,
  InvestigationResult,
  VerificationResult,
  VerdictStatus,
} from "./types";
import { DEFAULT_AGENT_CONFIG } from "./types";

export async function verifyInvestigation(
  finding: Finding,
  investigation: InvestigationResult,
  config: AgentScanConfig,
  injectedClient?: Anthropic
): Promise<VerificationResult> {
  const model = config.model || DEFAULT_AGENT_CONFIG.model;
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || process.env.WREN_LLM_KEY;

  let client: Anthropic;
  if (injectedClient) {
    client = injectedClient;
  } else {
    if (!apiKey) {
      return {
        findingId: finding.id,
        verdict: "CONFIRMED",
        rationale: "LLM unauthenticated; defaulting to static confirmation.",
        confidence: 0.5,
      };
    }
    client = new Anthropic({
      apiKey,
      baseURL: config.apiUrl || undefined,
    });
  }

  config.onProgress?.({
    stage: "verifier",
    findingId: finding.id,
    message: "Verifying gathered evidence against vulnerability hypothesis",
  });

  const prompt = `You are an expert security verifier. Evaluate the evidence gathered during investigation to determine if the following finding is a TRUE vulnerability or a FALSE POSITIVE mitigated by other codebase components.

Finding:
- Rule: ${finding.ruleId} (${finding.category})
- Severity: ${finding.severity}
- Title: ${finding.title}
- File: ${finding.location.filePath}:${finding.location.startLine}-${finding.location.endLine}
- Explanation: ${finding.plainEnglishExplanation}

Gathered Investigation Evidence & Context:
${investigation.gatheredContext.length > 0 ? investigation.gatheredContext.join("\n\n") : "(No external context requested during investigation)"}

Instructions:
1. Determine if this is:
   - "FALSE_POSITIVE" (e.g., protected by Next.js middleware, higher-level session wrapper, or sanitized before reaching this point)
   - "CONFIRMED" (the vulnerability is real and can be triggered)
   - "SEVERITY_ADJUSTED" (vulnerability exists but impact is reduced or increased)
2. Return ONLY a valid JSON object matching this schema:
{
  "verdict": "CONFIRMED" | "FALSE_POSITIVE" | "SEVERITY_ADJUSTED",
  "rationale": "Clear explanation citing the investigated evidence",
  "confidence": 0.0 to 1.0,
  "adjustedSeverity": "critical" | "high" | "medium" | "low" | "info" (optional)
}`;

  try {
    const response: any = await client.messages.create({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content?.[0]?.text || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validVerdicts: VerdictStatus[] = ["CONFIRMED", "FALSE_POSITIVE", "SEVERITY_ADJUSTED"];
      const verdict: VerdictStatus = validVerdicts.includes(parsed.verdict)
        ? parsed.verdict
        : "CONFIRMED";

      return {
        findingId: finding.id,
        verdict,
        rationale: parsed.rationale || "Evidence evaluated by verifier.",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
        adjustedSeverity: parsed.adjustedSeverity,
      };
    }

    return {
      findingId: finding.id,
      verdict: "CONFIRMED",
      rationale: "Verification completed with unstructured evidence.",
      confidence: 0.7,
    };
  } catch (err) {
    return {
      findingId: finding.id,
      verdict: "CONFIRMED",
      rationale: `Verification error: ${err instanceof Error ? err.message : String(err)}; retained static finding.`,
      confidence: 0.5,
    };
  }
}
