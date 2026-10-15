import type { Finding, Severity } from "@wren/shared-types";

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

export function sortFindingsBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const diff = (SEVERITY_WEIGHTS[b.severity] || 0) - (SEVERITY_WEIGHTS[a.severity] || 0);
    if (diff !== 0) return diff;
    return a.location.filePath.localeCompare(b.location.filePath);
  });
}
