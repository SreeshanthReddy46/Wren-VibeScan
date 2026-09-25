import chalk from "chalk";
import type { Severity } from "@wren/shared-types";

export function formatSeverityBadge(severity: Severity): string {
  switch (severity) {
    case "critical":
      return chalk.red.bold("CRITICAL");
    case "high":
      return chalk.yellow("HIGH");
    case "medium":
      return chalk.blue("MEDIUM");
    case "low":
      return chalk.gray("LOW");
    case "info":
    default:
      return chalk.dim("INFO");
  }
}
