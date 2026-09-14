import { cac } from "cac";
import pc from "picocolors";
import { runCheckCommand } from "./commands/check";
import { runFixCommand } from "./commands/fix";
import { runInitCommand } from "./commands/init";
import { runLoginCommand } from "./commands/login";
import { runLogoutCommand } from "./commands/logout";
import { reportCrash } from "./telemetry/crash-reporter";
import { ExitCode } from "./utils/exit-codes";

function handleCliError(error: unknown): void {
  reportCrash(error);
  const isDebug = Boolean(process.env.DEBUG || process.env.WREN_VERBOSE);
  if (isDebug && error instanceof Error && error.stack) {
    console.error(error.stack);
  } else {
    console.error(pc.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
  }
  process.exit(ExitCode.FATAL_ERROR);
}

const cli = cac("wren-security");

cli
  .command("[path]", "Scan codebase for AI-generated security vulnerabilities")
  .alias("check")
  .alias("scan")
  .option("--fail-on-critical", "Exit with code 1 if critical vulnerabilities are found")
  .option("--fail-on <severity>", "Exit with code 1 if issues at or above severity are found (critical, high, medium)")
  .option("--format <format>", "Output format: terminal, json, or sarif (default: terminal)")
  .option("--llm", "Enable LLM reasoning enrichment")
  .option("--async", "Submit scan asynchronously and return immediately with dashboard link")
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
        async: options.async,
      });
      process.exit(exitCode);
    } catch (error) {
      handleCliError(error);
    }
  });

cli
  .command("init", "Initialize Wren configuration (.wrenignore and .wrenrc.json)")
  .action(() => {
    try {
      runInitCommand();
    } catch (error) {
      handleCliError(error);
    }
  });

cli
  .command("login [token]", "Authenticate local CLI with Wren Cloud")
  .action(async (token) => {
    try {
      await runLoginCommand(token);
    } catch (error) {
      handleCliError(error);
    }
  });

cli
  .command("logout", "Log out and remove stored Wren credentials")
  .action(() => {
    try {
      runLogoutCommand();
    } catch (error) {
      handleCliError(error);
    }
  });

cli
  .command("fix [findingId]", "Generate and apply remediation patches or open GitHub PRs")
  .option("--dry-run", "Preview the patch without modifying any files")
  .option("--apply-locally", "Apply the patch directly to local working tree")
  .option("--open-pr", "Dispatch autonomous remediation agent to open a pull request")
  .option("--repo <repo>", "Target GitHub repository (owner/repo)")
  .option("--file <file>", "Target file path to patch")
  .action(async (findingId, options) => {
    try {
      const exitCode = await runFixCommand(findingId, {
        dryRun: options.dryRun,
        applyLocally: options.applyLocally,
        openPr: options.openPr,
        repo: options.repo,
        file: options.file,
      });
      process.exit(exitCode);
    } catch (error) {
      handleCliError(error);
    }
  });

let version = "2.1.0";
try {
  version = require("../package.json").version;
} catch {}

cli.help();
cli.version(version);

try {
  cli.parse();
} catch (error) {
  handleCliError(error);
}
