import { cac } from "cac";
import { runCheckCommand } from "./commands/check";
import { runInitCommand } from "./commands/init";
import { runLoginCommand } from "./commands/login";
import { runLogoutCommand } from "./commands/logout";
import { reportCrash } from "./telemetry/crash-reporter";
import { ExitCode } from "./utils/exit-codes";

const cli = cac("wren-security");

// 1. wren-security check [path] (or wren-security scan)
cli
  .command("[path]", "Scan codebase for AI-generated security vulnerabilities")
  .alias("check")
  .alias("scan")
  .option("--fail-on-critical", "Exit with code 1 if critical vulnerabilities are found")
  .option("--fail-on <severity>", "Exit with code 1 if issues at or above severity are found (critical, high, medium)")
  .option("--format <format>", "Output format: terminal, json, or sarif (default: terminal)")
  .option("--llm", "Enable LLM reasoning enrichment")
  .option("-o, --output <file>", "Write report to output file")
  .option("--api-key <key>", "Wren or Claude API key")
  .action(async (targetPath = ".", options) => {
    try {
      const exitCode = await runCheckCommand(targetPath, {
        failOnCritical: options.failOnCritical,
        failOn: options.failOn,
        format: options.format,
        llm: options.llm,
        output: options.output,
        apiKey: options.apiKey,
      });
      process.exit(exitCode);
    } catch (error) {
      reportCrash(error);
      process.exit(ExitCode.FATAL_ERROR);
    }
  });

// 2. wren init
cli
  .command("init", "Initialize Wren configuration (.wrenignore and .wrenrc.json)")
  .action(() => {
    try {
      runInitCommand();
    } catch (error) {
      reportCrash(error);
      process.exit(ExitCode.FATAL_ERROR);
    }
  });

// 3. wren login [token]
cli
  .command("login [token]", "Authenticate local CLI with Wren Cloud")
  .action(async (token) => {
    try {
      await runLoginCommand(token);
    } catch (error) {
      reportCrash(error);
      process.exit(ExitCode.FATAL_ERROR);
    }
  });

// 4. wren logout
cli
  .command("logout", "Log out and remove stored Wren credentials")
  .action(() => {
    try {
      runLogoutCommand();
    } catch (error) {
      reportCrash(error);
      process.exit(ExitCode.FATAL_ERROR);
    }
  });

cli.help();
cli.version("1.0.0");

try {
  cli.parse();
} catch (error) {
  reportCrash(error);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(ExitCode.FATAL_ERROR);
}
