import type { Finding } from "@wren/shared-types";
import type { PlannerResult } from "./types";

const CONTEXT_REQUIRING_CATEGORIES = new Set(["auth", "database", "configuration", "dependency"]);

export function planInvestigation(findings: Finding[]): PlannerResult {
  const investigationQueue: Finding[] = [];
  const directFindings: Finding[] = [];

  for (const finding of findings) {

    if (finding.category === "secret") {
      directFindings.push(finding);
      continue;
    }

    if (CONTEXT_REQUIRING_CATEGORIES.has(finding.category)) {
      investigationQueue.push(finding);
      continue;
    }

    investigationQueue.push(finding);
  }

  return {
    investigationQueue,
    directFindings,
  };
}
