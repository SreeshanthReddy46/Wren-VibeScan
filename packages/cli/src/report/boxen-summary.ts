import boxen from "boxen";
import chalk from "chalk";
import type { ScanResult, Severity } from "@wren/shared-types";

function getHighestSeverity(result: ScanResult): Severity {
  if (result.summary.critical > 0) return "critical";
  if (result.summary.high > 0) return "high";
  if (result.summary.medium > 0) return "medium";
  if (result.summary.low > 0) return "low";
  return "info";
}

export function renderBoxenSummary(result: ScanResult): string {
  const isNoColor = Boolean(process.env.NO_COLOR);
  const durationSec = (result.summary.scanDurationMs / 1000).toFixed(1);

  if (result.findings.length === 0) {
    const text = [
      (isNoColor ? "✔ " : chalk.green("✔ ")) + "No vulnerabilities found! Your codebase looks safe to deploy.",
      `Scanned ${result.summary.filesScanned} files in ${durationSec}s`,
    ].join("\n");

    return boxen(text, {
      padding: 1,
      margin: 1,
      borderColor: isNoColor ? undefined : "green",
      title: "Scan Passed",
    });
  }

  const highest = getHighestSeverity(result);
  const borderColor = isNoColor
    ? undefined
    : highest === "critical" || highest === "high"
      ? "red"
      : highest === "medium"
        ? "yellow"
        : "blue";

  const total = result.findings.length;
  const issueText = `${total} issue${total === 1 ? "" : "s"} found`;
  const breakdown = [
    result.summary.critical > 0 ? `${result.summary.critical} critical` : null,
    result.summary.high > 0 ? `${result.summary.high} high` : null,
    result.summary.medium > 0 ? `${result.summary.medium} medium` : null,
    result.summary.low > 0 ? `${result.summary.low} low` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const lines = [
    issueText,
    breakdown,
    `Scanned ${result.summary.filesScanned} files in ${durationSec}s`,
  ];

  return boxen(lines.join("\n"), {
    padding: 1,
    margin: 1,
    borderColor,
    title: "Scan Complete",
  });
}
