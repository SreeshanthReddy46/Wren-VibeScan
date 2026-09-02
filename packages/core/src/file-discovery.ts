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

export interface DiscoveredFile {
  absolutePath: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
}

export function discoverFiles(
  targetDir: string,
  userIgnorePatterns: string[] = []
): DiscoveredFile[] {
  const root = path.resolve(targetDir);
  const ig = ignore();

  // Load .gitignore if present
  const gitignorePath = path.join(root, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
      ig.add(gitignoreContent);
    } catch {
      // Ignore read errors
    }
  }

  // Load .wrenignore if present
  const wrenignorePath = path.join(root, ".wrenignore");
  if (fs.existsSync(wrenignorePath)) {
    try {
      const wrenignoreContent = fs.readFileSync(wrenignorePath, "utf8");
      ig.add(wrenignoreContent);
    } catch {
      // Ignore read errors
    }
  }

  if (userIgnorePatterns.length > 0) {
    ig.add(userIgnorePatterns);
  }

  const results: DiscoveredFile[] = [];

  function walk(currentDir: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path
        .relative(root, fullPath)
        .replace(/\\/g, "/");

      if (entry.isDirectory()) {
        if (DEFAULT_IGNORED_DIRS.has(entry.name)) {
          continue;
        }
        if (relativePath && ig.ignores(relativePath + "/")) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        const baseName = entry.name.toLowerCase();

        // Check if ignored or binary
        if (BINARY_EXTENSIONS.has(ext)) {
          continue;
        }

        if (relativePath && ig.ignores(relativePath)) {
          continue;
        }

        // Only scan code / config / env files or check .env prefixes
        const isEnvFile = baseName.startsWith(".env");
        if (!isEnvFile && !SCANNABLE_EXTENSIONS.has(ext) && ext !== "") {
          continue;
        }

        try {
          const stats = fs.statSync(fullPath);
          // Limit individual file size to 2MB to avoid memory leaks
          if (stats.size <= 2 * 1024 * 1024) {
            results.push({
              absolutePath: fullPath,
              relativePath,
              extension: ext || baseName,
              sizeBytes: stats.size,
            });
          }
        } catch {
          // Skip inaccessible files
        }
      }
    }
  }

  walk(root);
  return results;
}
