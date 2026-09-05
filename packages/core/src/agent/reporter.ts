import type { Finding } from "@wren/shared-types";
import type { VerificationResult } from "./types";

export function synthesizeFindings(
  originalFindings: Finding[],
  verifications: Map<string, VerificationResult>
): Finding[] {
  const result: Finding[] = [];

  for (const finding of originalFindings) {
    const verification = verifications.get(finding.id);

    // If not verified or no verification record, keep original finding
    if (!verification) {
      result.push(finding);
      continue;
    }

    // Filter out false positives confirmed by evidence
    if (verification.verdict === "FALSE_POSITIVE") {
      continue;
    }

    // Apply adjustments
    const updatedFinding: Finding = {
      ...finding,
      severity: verification.adjustedSeverity || finding.severity,
      plainEnglishExplanation: `${finding.plainEnglishExplanation} [Verified by Wren Agent: ${verification.rationale}]`,
      fix: verification.suggestedFix || finding.fix,
    };

    result.push(updatedFinding);
  }

  return result;
}
