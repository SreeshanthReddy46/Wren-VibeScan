import type { Finding, ScanResult, Severity } from "@wren/shared-types";
import pc from "picocolors";
import { formatSeverityBadge } from "./severity-colors";
import { renderBoxenSummary } from "./boxen-summary";

export function formatTerminalReport(result: ScanResult): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(pc.bold(pc.cyan("🦅 Wren Security Scanner")) + pc.dim(` v${result.engineVersion}`));
  lines.push(pc.dim(`Target: ${result.targetPath}`));
  lines.push(pc.dim(`Scanned ${result.summary.filesScanned} files in ${result.summary.scanDurationMs}ms`));
  lines.push("");

  if (result.llmReasoningNote) {
    lines.push(pc.yellow(`⚠ ${result.llmReasoningNote}`));
    lines.push("");
  }

  if (result.findings.length === 0) {
    lines.push(renderBoxenSummary(result));
    lines.push("");
    return lines.join("\n");
  }

  lines.push(
    pc.bold(
      `Found ${pc.red(result.findings.length)} issue${result.findings.length === 1 ? "" : "s"}: ` +
        `[${pc.red(result.summary.critical + " Critical")}, ` +
        `${pc.yellow(result.summary.high + " High")}, ` +
        `${pc.magenta(result.summary.medium + " Medium")}]`
    )
  );
  lines.push(pc.dim("─".repeat(70)));
  lines.push("");

  result.findings.forEach((finding, idx) => {
    const badge = formatSeverityBadge(finding.severity);
    lines.push(`${badge} ${pc.bold(finding.title)}`);
    lines.push(
      `  ${pc.dim("at")} ${pc.cyan(finding.location.filePath)}:${pc.yellow(finding.location.startLine.toString())}`
    );
    lines.push(`  ${pc.dim("rule:")} ${finding.ruleId} ${finding.cwe ? pc.dim(`(${finding.cwe})`) : ""}`);
    lines.push("");

    lines.push(`  ${pc.dim("Explanation:")} ${finding.plainEnglishExplanation}`);
    lines.push("");

    if (finding.location.snippet) {
      lines.push(`  ${pc.dim("Code:")}`);
      lines.push(`    ${pc.red(pc.dim("- "))}${finding.location.snippet}`);
    }

    if (finding.fix) {
      lines.push(`  ${pc.dim("Suggested Fix:")} ${pc.italic(finding.fix.description)}`);
      if (finding.fix.diff) {
        finding.fix.diff.split("\n").forEach((diffLine) => {
          if (diffLine.startsWith("+")) {
            lines.push(`    ${pc.green(diffLine)}`);
          } else if (diffLine.startsWith("-")) {
            lines.push(`    ${pc.red(diffLine)}`);
          } else {
            lines.push(`    ${diffLine}`);
          }
        });
      }
    }

    if (idx < result.findings.length - 1) {
      lines.push("");
      lines.push(pc.dim("  · · ·"));
      lines.push("");
    }
  });

  lines.push("");
  lines.push(renderBoxenSummary(result));
  lines.push("");

  return lines.join("\n");
}
