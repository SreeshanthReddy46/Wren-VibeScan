import { runScan } from "@wren/core";
import type { OutputFormat, ScanConfig, Severity } from "@wren/shared-types";
import { formatTerminalReport } from "../report/terminal-formatter";
import { formatJsonReport } from "../report/json-formatter";
import { formatSarifReport } from "../report/sarif-formatter";
import { ExitCode } from "../utils/exit-codes";
import { logger } from "../utils/logger";
import { loadUserConfig } from "../auth/token-storage";
import * as fs from "fs";
import pc from "picocolors";

export interface CheckCommandOptions {
  failOnCritical?: boolean;
  failOn?: Severity;
  format?: OutputFormat;
  llm?: boolean;
  output?: string;
  apiKey?: string;
}

export async function runCheckCommand(
  targetPath: string = ".",
  options: CheckCommandOptions = {}
): Promise<number> {
  const userConfig = loadUserConfig();
  const format: OutputFormat = options.format || "terminal";

  const config: ScanConfig = {
    targetPath,
    format,
    enableLlmReasoning: options.llm || false,
    apiKey: options.apiKey || userConfig.apiKey,
    failOnSeverity: options.failOn || (options.failOnCritical ? "critical" : undefined),
  };

  if (format === "terminal") {
    console.log(pc.cyan("🔍 Scanning for AI-generated code vulnerabilities..."));
  }

  try {
    const result = await runScan(config);

    // Format output
    let outputText = "";
    if (format === "json") {
      outputText = formatJsonReport(result);
    } else if (format === "sarif") {
      outputText = formatSarifReport(result);
    } else {
      outputText = formatTerminalReport(result);
    }

    if (options.output) {
      fs.writeFileSync(options.output, outputText, "utf8");
      if (format === "terminal") {
        logger.success(`Report written to ${options.output}`);
      }
    } else {
      console.log(outputText);
    }

    // Determine exit code
    const failSeverity = config.failOnSeverity;
    if (failSeverity) {
      const severityRank: Record<Severity, number> = {
        critical: 5,
        high: 4,
        medium: 3,
        low: 2,
        info: 1,
      };
      const thresholdRank = severityRank[failSeverity];

      const hasFailingFinding = result.findings.some(
        (f) => severityRank[f.severity] >= thresholdRank
      );

      if (hasFailingFinding) {
        if (format === "terminal") {
          logger.error(
            `Scan failed: Found findings at or above '${failSeverity}' threshold.`
          );
        }
        return ExitCode.VULNERABILITIES_FOUND;
      }
    }

    return ExitCode.SUCCESS;
  } catch (error) {
    logger.error(`Scan execution failed: ${error instanceof Error ? error.message : String(error)}`);
    return ExitCode.FATAL_ERROR;
  }
}
