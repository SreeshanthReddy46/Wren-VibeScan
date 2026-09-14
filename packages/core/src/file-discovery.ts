import * as fs from "fs";
import * as path from "path";
import ignore from "ignore";

const DEFAULT_IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".turbo",
  "dist",
  "build",
  "coverage",
  ".vercel",
  ".changeset",
]);

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".zip",
  ".tar",
  ".gz",
  ".mp4",
  ".mov",
  ".mp3",
  ".wasm",
  ".lock",
  ".lockb",
]);

const SCANNABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.preview",
  ".sql",
  ".prisma",
  ".rules",
  ".yaml",
  ".yml",
]);

const IGNORED_FILE_NAMES = new Set([
  ".gitignore",
  ".wrenignore",
  ".npmignore",
  ".prettierignore",
  ".eslintignore",
]);

export const DEFAULT_MAX_FILES = 10000;
export const DEFAULT_MAX_DEPTH = 25;
export const DEFAULT_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export interface DiscoveredFile {
  absolutePath: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
}

export interface FileDiscoveryOptions {
  maxFiles?: number;
  maxDepth?: number;
  maxSizeBytes?: number;
}

export function discoverFiles(
  targetDir: string,
  userIgnorePatterns: string[] = [],
  options: FileDiscoveryOptions = {}
): DiscoveredFile[] {
  const root = path.resolve(targetDir);
  const ig = ignore();
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxSizeBytes = options.maxSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES;

  const gitignorePath = path.join(root, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
      ig.add(gitignoreContent);
    } catch {
      console.warn("⚠ Warning: Malformed .gitignore file could not be parsed; proceeding with default ignore patterns.");
    }
  }

  const wrenignorePath = path.join(root, ".wrenignore");
  if (fs.existsSync(wrenignorePath)) {
    try {
      const wrenignoreContent = fs.readFileSync(wrenignorePath, "utf8");
      ig.add(wrenignoreContent);
    } catch {
      console.warn("⚠ Warning: Malformed .wrenignore file could not be parsed; proceeding with default ignore patterns.");
    }
  }

  if (userIgnorePatterns.length > 0) {
    try {
      ig.add(userIgnorePatterns);
    } catch {
      console.warn("⚠ Warning: Custom ignore patterns could not be parsed; proceeding with defaults.");
    }
  }

  const results: DiscoveredFile[] = [];

  function isIgnored(target: string): boolean {
    if (!target) return false;
    try {
      return ig.ignores(target);
    } catch {
      return false;
    }
  }

  function walk(currentDir: string, currentDepth: number) {
    if (results.length >= maxFiles || currentDepth > maxDepth) {
      return;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err: any) {
      if (err?.code === "EACCES" || err?.code === "EPERM") {
        console.warn(`⚠ Warning: Permission denied accessing directory: ${currentDir}`);
      }
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) {
        break;
      }

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path
        .relative(root, fullPath)
        .replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (DEFAULT_IGNORED_DIRS.has(entry.name)) {
          continue;
        }
        if (isIgnored(relativePath + "/")) {
          continue;
        }
        walk(fullPath, currentDepth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const baseName = entry.name.toLowerCase();

        if (IGNORED_FILE_NAMES.has(baseName)) {
          continue;
        }

        if (BINARY_EXTENSIONS.has(ext)) {
          continue;
        }

        if (isIgnored(relativePath)) {
          continue;
        }

        const isEnvFile = baseName.startsWith(".env");
        if (!isEnvFile && !SCANNABLE_EXTENSIONS.has(ext) && ext !== "") {
          continue;
        }

        try {
          const stats = fs.statSync(fullPath);

          if (stats.size <= maxSizeBytes) {
            results.push({
              absolutePath: fullPath,
              relativePath,
              extension: ext || baseName,
              sizeBytes: stats.size,
            });
          }
        } catch (err: any) {
          if (err?.code === "EACCES" || err?.code === "EPERM") {
            console.warn(`⚠ Warning: Permission denied accessing file: ${fullPath}`);
          }
        }
      }
    }
  }

  walk(root, 0);
  return results;
}
