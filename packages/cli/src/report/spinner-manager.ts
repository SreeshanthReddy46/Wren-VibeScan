import ora, { type Ora } from "ora";
import type { ScanProgressEvent } from "@wren/shared-types";

export interface SpinnerManagerOptions {
  quiet?: boolean;
}

export class TerminalSpinnerManager {
  readonly isSilent: boolean;
  private spinner: Ora | null = null;
  private sigintHandler: (() => void) | null = null;

  constructor(options: SpinnerManagerOptions = {}) {
    this.isSilent = Boolean(
      options.quiet ||
        process.env.CI ||
        process.stdout.isTTY === false ||
        process.env.NO_SPINNER
    );
  }

  start(): void {
    if (this.sigintHandler) return;
    this.sigintHandler = () => {
      this.stop();
      process.stderr.write("\nScan cancelled by user\n");
      process.exit(130);
    };
    process.once("SIGINT", this.sigintHandler);
  }

  handleProgress(event: ScanProgressEvent): void {
    if (this.isSilent) return;

    switch (event.stage) {
      case "discovery_start":
        this.spinner = ora("Discovering files...").start();
        break;
      case "discovery_complete":
        if (this.spinner) {
          this.spinner.succeed(`Discovered ${event.fileCount} files (${event.durationMs}ms)`);
          this.spinner = ora("Running static analysis...").start();
        }
        break;
      case "scan_file":
        if (this.spinner) {
          this.spinner.text = `Scanning files (${event.current}/${event.total})...`;
        }
        break;
      case "static_complete":
        if (this.spinner) {
          this.spinner.succeed(`Static analysis complete (${event.durationMs}ms)`);
          this.spinner = null;
        }
        break;
      case "reasoning_start":
        this.spinner = ora(
          `Reasoning on ${event.candidateCount} flagged candidates with Deep Reasoning...`
        ).start();
        break;
      case "reasoning_complete":
        if (this.spinner) {
          this.spinner.succeed(`Investigation complete (${event.durationMs}ms)`);
          this.spinner = null;
        }
        break;
    }
  }

  stop(): void {
    if (this.sigintHandler) {
      process.removeListener("SIGINT", this.sigintHandler);
      this.sigintHandler = null;
    }
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}
