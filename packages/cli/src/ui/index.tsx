import React from "react";
import { render } from "ink";
import { runScan } from "@wren/core";
import { App } from "./App";
import { enterAlternateScreen, exitAlternateScreen } from "./screen-buffer";

export function shouldLaunchTui(
  argv: string[],
  isTTY: boolean = Boolean(process.stdout.isTTY),
  isCI: boolean = Boolean(process.env.CI)
): boolean {
  if (!isTTY || isCI) return false;
  const filtered = argv.filter((arg) => !arg.startsWith("-"));
  const flags = argv.filter((arg) => arg.startsWith("-"));
  if (flags.includes("--help") || flags.includes("-h") || flags.includes("--version") || flags.includes("-v")) {
    return false;
  }
  return filtered.length === 0 && flags.length === 0;
}

export async function startInteractiveTui(targetPath: string = "."): Promise<number> {
  enterAlternateScreen();

  const scanResult = await runScan({
    targetPath,
    format: "terminal",
  });

  return new Promise<number>((resolve) => {
    let resolved = false;

    const cleanupAndResolve = (code: number) => {
      if (!resolved) {
        resolved = true;
        exitAlternateScreen();
        resolve(code);
      }
    };

    const instance = render(
      <App
        targetPath={targetPath}
        initialFindings={scanResult.findings}
        onExit={(code) => {
          cleanupAndResolve(code);
        }}
      />
    );

    instance.waitUntilExit().then(() => {
      cleanupAndResolve(0);
    });
  });
}

export { App } from "./App";
export { Header } from "./components/Header";
export { FindingsList } from "./components/FindingsList";
export { FindingDetail } from "./components/FindingDetail";
export { StatusBar } from "./components/StatusBar";
export { appendIgnoreRule } from "./ignore-handler";
export { sortFindingsBySeverity } from "./model";
export { enterAlternateScreen, exitAlternateScreen } from "./screen-buffer";
