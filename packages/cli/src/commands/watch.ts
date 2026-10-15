import * as fs from "fs";
import * as path from "path";
import pc from "picocolors";
import { runScan } from "@wren/core";
import { formatTerminalReport } from "../report/terminal-formatter";
import { loadIgnoreStore, isFindingIgnored } from "../ignore/ignore-store";

export interface WatchCommandOptions {
  targetPath?: string;
  debounceMs?: number;
  onceForTest?: boolean;
}

export function isWatchableFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (
    normalized.includes("/node_modules/") ||
    normalized.startsWith("node_modules/") ||
    normalized.includes("/.git/") ||
    normalized.startsWith(".git/") ||
    normalized.includes("/dist/") ||
    normalized.startsWith("dist/") ||
    normalized.includes("/.wren/") ||
    normalized.startsWith(".wren/") ||
    normalized.includes("/.next/") ||
    normalized.startsWith(".next/")
  ) {
    return false;
  }

  const ext = path.extname(normalized).toLowerCase();
  const base = path.basename(normalized);
  return (
    [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"].includes(ext) ||
    base.startsWith(".env")
  );
}

export async function runWatchCommand(
  targetPath: string = ".",
  options: WatchCommandOptions = {}
): Promise<void> {
  const resolvedTarget = path.resolve(targetPath);
  const debounceMs = options.debounceMs ?? 200;
  let timer: NodeJS.Timeout | null = null;
  let isScanning = false;
  let changedFiles = new Set<string>();

  console.log(
    pc.cyan(`\n👀 Wren Watch Mode: Monitoring ${resolvedTarget} for file changes...\n`)
  );

  const triggerScan = async (changedList?: string[]) => {
    if (isScanning) return;
    isScanning = true;

    try {
      if (process.stdout.isTTY) {
        process.stdout.write("\x1b[2J\x1b[H");
      }

      const timestamp = new Date().toLocaleTimeString();
      const changeNote =
        changedList && changedList.length > 0
          ? pc.dim(` [Re-scanning ${changedList.length} changed file${changedList.length > 1 ? "s" : ""}]`)
          : "";
      console.log(
        pc.bold(pc.cyan("🦅 Wren Watch Active")) +
          pc.dim(` · Last scanned: ${timestamp}`) +
          changeNote
      );

      const result = await runScan({
        targetPath: resolvedTarget,
        format: "terminal",
      });

      const store = loadIgnoreStore(resolvedTarget);
      result.findings = result.findings.filter((f) => !isFindingIgnored(f, store));

      if (changedList && changedList.length > 0) {
        const normalizedChanged = new Set(
          changedList.map((f) => f.replace(/\\/g, "/"))
        );
        const filteredFindings = result.findings.filter((f) => {
          const norm = f.location.filePath.replace(/\\/g, "/");
          return (
            normalizedChanged.has(norm) ||
            Array.from(normalizedChanged).some((c) => norm.endsWith(c))
          );
        });
        if (filteredFindings.length > 0) {
          result.findings = filteredFindings;
        }
      }

      console.log(formatTerminalReport(result));
      console.log(pc.dim("\nWatching for changes... Press Ctrl+C to exit.\n"));
    } finally {
      isScanning = false;
    }
  };

  await triggerScan();

  if (options.onceForTest) {
    return;
  }

  const watcher = fs.watch(resolvedTarget, { recursive: true }, (eventType, filename) => {
    if (!filename || !isWatchableFile(filename)) return;

    changedFiles.add(filename);

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const filesToScan = Array.from(changedFiles);
      changedFiles.clear();
      triggerScan(filesToScan);
    }, debounceMs);
  });

  return new Promise<void>((resolve) => {
    process.once("SIGINT", () => {
      watcher.close();
      resolve();
    });
  });
}
