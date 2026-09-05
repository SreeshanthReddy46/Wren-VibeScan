import type { Finding } from "@wren/shared-types";
import type { PlannerResult } from "./types.ts";

/**
 * Rules and categories that require cross-file codebase investigation.
 * For example:
 * - Auth rules: requires checking if middleware.ts, layout guards, or wrappers enforce auth elsewhere.
 * - Database rules: requires checking if input was sanitized in calling controllers or helper utilities.
 * - Configuration / Dependency: requires checking environment configurations and exports.
 */
const CONTEXT_REQUIRING_CATEGORIES = new Set(["auth", "database", "configuration", "dependency"]);

export function planInvestigation(findings: Finding[]): PlannerResult {
  const investigationQueue: Finding[] = [];
  const directFindings: Finding[] = [];

  for (const finding of findings) {
    // Hardcoded secrets are self-contained and verified locally by entropy/pattern
    if (finding.category === "secret") {
      directFindings.push(finding);
      continue;
    }

    // Contextual findings require cross-file verification via tools
    if (CONTEXT_REQUIRING_CATEGORIES.has(finding.category)) {
      investigationQueue.push(finding);
      continue;
    }

    // Default: queue for investigation if it might have external mitigations
    investigationQueue.push(finding);
  }

  return {
    investigationQueue,
    directFindings,
  };
}
