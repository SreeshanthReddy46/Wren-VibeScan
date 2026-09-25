import Table from "cli-table3";
import type { ScanResult } from "@wren/shared-types";
import { formatSeverityBadge } from "./severity-colors";
import { renderBoxenSummary } from "./boxen-summary";

export function formatTableReport(result: ScanResult): string {
  if (result.findings.length === 0) {
    return renderBoxenSummary(result);
  }

  const table = new Table({
    head: ["Severity", "Rule ID", "Location", "Description"],
    style: {
      head: [],
      border: [],
    },
    colWidths: [12, 16, 32, 42],
    wordWrap: true,
  });

  for (const finding of result.findings) {
    const loc = `${finding.location.filePath}:${finding.location.startLine}`;
    table.push([
      formatSeverityBadge(finding.severity),
      finding.ruleId,
      loc,
      finding.title,
    ]);
  }

  const outputLines = [
    table.toString(),
    renderBoxenSummary(result),
  ];

  return outputLines.join("\n");
}
