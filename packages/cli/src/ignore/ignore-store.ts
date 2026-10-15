import * as fs from "fs";
import * as path from "path";
import type { Finding } from "@wren/shared-types";

export interface IgnoreEntry {
  id: string;
  ruleId: string;
  filePath: string;
  reason: string;
  ignoredAt: string;
}

export interface IgnoreStore {
  version: string;
  ignores: IgnoreEntry[];
}

export const PRESET_IGNORE_REASONS = [
  "False positive / intentional pattern",
  "Test fixture / internal mock",
  "Mitigated by external boundary / WAF",
  "Custom reason",
];

export function getWrenDir(targetDir: string = "."): string {
  return path.join(path.resolve(targetDir), ".wren");
}

export function getIgnoreFilePath(targetDir: string = "."): string {
  return path.join(getWrenDir(targetDir), "ignore.json");
}

export function loadIgnoreStore(targetDir: string = "."): IgnoreStore {
  migrateLegacyWrenignore(targetDir);
  const ignoreFile = getIgnoreFilePath(targetDir);

  if (fs.existsSync(ignoreFile)) {
    try {
      const content = fs.readFileSync(ignoreFile, "utf8");
      return JSON.parse(content) as IgnoreStore;
    } catch {
      return { version: "1.0.0", ignores: [] };
    }
  }

  return { version: "1.0.0", ignores: [] };
}

export function addIgnoreEntry(
  targetDir: string,
  entry: Omit<IgnoreEntry, "id" | "ignoredAt">
): void {
  const store = loadIgnoreStore(targetDir);
  const wrenDir = getWrenDir(targetDir);
  const ignoreFile = getIgnoreFilePath(targetDir);

  if (!fs.existsSync(wrenDir)) {
    fs.mkdirSync(wrenDir, { recursive: true });
  }

  const normalizedPath = entry.filePath.replace(/\\/g, "/");
  const alreadyIgnored = store.ignores.some(
    (item) => item.ruleId === entry.ruleId && item.filePath === normalizedPath
  );

  if (alreadyIgnored) return;

  const newEntry: IgnoreEntry = {
    id: `ign-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ruleId: entry.ruleId,
    filePath: normalizedPath,
    reason: entry.reason,
    ignoredAt: new Date().toISOString(),
  };

  store.ignores.push(newEntry);
  fs.writeFileSync(ignoreFile, JSON.stringify(store, null, 2), "utf8");
}

export function isFindingIgnored(finding: Finding, store: IgnoreStore): boolean {
  const normalizedPath = finding.location.filePath.replace(/\\/g, "/");
  return store.ignores.some((entry) => {
    const ruleMatch = entry.ruleId === "*" || entry.ruleId === finding.ruleId;
    const pathMatch =
      entry.filePath === "*" ||
      entry.filePath === normalizedPath ||
      normalizedPath.startsWith(entry.filePath.replace(/\*\*$/, ""));
    return ruleMatch && pathMatch;
  });
}

export function migrateLegacyWrenignore(targetDir: string = "."): boolean {
  const legacyFile = path.join(path.resolve(targetDir), ".wrenignore");
  const ignoreFile = getIgnoreFilePath(targetDir);

  if (!fs.existsSync(legacyFile) || fs.existsSync(ignoreFile)) {
    return false;
  }

  const wrenDir = getWrenDir(targetDir);
  if (!fs.existsSync(wrenDir)) {
    fs.mkdirSync(wrenDir, { recursive: true });
  }

  try {
    const lines = fs
      .readFileSync(legacyFile, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));

    const store: IgnoreStore = {
      version: "1.0.0",
      ignores: lines.map((line, idx) => ({
        id: `migrated-${idx + 1}`,
        ruleId: "*",
        filePath: line.replace(/\\/g, "/"),
        reason: "Migrated from .wrenignore",
        ignoredAt: new Date().toISOString(),
      })),
    };

    fs.writeFileSync(ignoreFile, JSON.stringify(store, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}
