import * as fs from "fs";
import * as path from "path";

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export const AGENT_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "read_file",
    description:
      "Returns the contents of a specific file in the scanned project. Strictly read-only.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative file path within the project to read",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "search_codebase",
    description:
      "Searches the project codebase for a regex or string pattern (e.g., finding where a variable, sanitizer, or utility is used). Strictly read-only.",
    input_schema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Text or regex pattern to search for across files",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "get_call_sites",
    description:
      "Returns every location where a specific function or route handler is invoked across the codebase. Strictly read-only.",
    input_schema: {
      type: "object",
      properties: {
        function_name: {
          type: "string",
          description: "Name of the function or method to find invocation call sites for",
        },
      },
      required: ["function_name"],
    },
  },
];

const PROHIBITED_MUTATION_TOOLS = new Set([
  "write_file",
  "delete_file",
  "exec",
  "spawn",
  "eval",
  "chmod",
  "unlink",
  "rm",
  "shell",
  "bash",
  "sh",
  "run_command",
  "run_script",
  "modify_file",
  "create_file",
  "append_file",
]);

const SENSITIVE_FILE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
  "id_rsa",
  "id_ed25519",
  "id_ecdsa",
  "id_dsa",
  ".npmrc",
  ".gitconfig",
  "credentials.json",
  "service-account.json",
]);

function isSensitivePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  const base = path.basename(normalized);
  if (SENSITIVE_FILE_NAMES.has(base)) return true;
  if (base.startsWith(".env")) return true;
  if (base.endsWith(".pem") || base.endsWith(".key")) return true;
  if (
    normalized.includes("/.git/") ||
    normalized.startsWith(".git/") ||
    normalized === ".git" ||
    (base === "config" && normalized.includes(".git"))
  ) {
    return true;
  }
  if (normalized.includes("/.ssh/") || normalized.startsWith(".ssh/")) return true;
  if (normalized.includes("/.aws/") || normalized.startsWith(".aws/")) return true;
  return false;
}

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".ssh",
  ".aws",
]);

function discoverProjectFiles(dir: string, maxFiles: number = 300): string[] {
  const results: string[] = [];

  function walk(currentDir: string) {
    if (results.length >= maxFiles) return;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) break;
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      if (isSensitivePath(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        if (isSensitivePath(fullPath)) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (
          [
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".mjs",
            ".cjs",
            ".json",
            ".py",
            ".go",
            ".sql",
          ].includes(ext)
        ) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}

export function executeAgentTool(
  toolName: string,
  args: Record<string, any>,
  targetPath: string
): string {
  const normalizedTool = (toolName || "").trim().toLowerCase();

  if (PROHIBITED_MUTATION_TOOLS.has(normalizedTool)) {
    return "Security Error: Mutation and execution tools are strictly prohibited. Agent operates under a strict read-only constraint.";
  }

  const root = path.resolve(targetPath);

  if (normalizedTool === "read_file") {
    const rawPath = String(args.path || "").trim();
    if (!rawPath) {
      return "Error: Missing required argument 'path'.";
    }

    const resolved = path.resolve(root, rawPath);
    const rel = path.relative(root, resolved);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return "Security Error: Path traversal outside the scanned project is strictly forbidden.";
    }

    if (isSensitivePath(rawPath) || isSensitivePath(resolved) || isSensitivePath(rel)) {
      return "Security Error: Access to credential and secret files is strictly prohibited.";
    }

    if (!fs.existsSync(resolved)) {
      return `Error: File not found at path: ${rawPath}`;
    }

    try {
      const stats = fs.statSync(resolved);
      if (!stats.isFile()) {
        return `Error: Specified path is not a file: ${rawPath}`;
      }

      if (stats.size > 100 * 1024) {
        const partial = fs.readFileSync(resolved, "utf8").slice(0, 50 * 1024);
        return `[File truncated to first 50KB]\n${partial}`;
      }

      return fs.readFileSync(resolved, "utf8");
    } catch (err: any) {
      return `Error reading file: ${err.message || String(err)}`;
    }
  }

  if (normalizedTool === "search_codebase") {
    const pattern = String(args.pattern || "").trim();
    if (!pattern) {
      return "Error: Missing required argument 'pattern'.";
    }

    try {
      const regex = new RegExp(pattern, "i");
      const files = discoverProjectFiles(root);
      const matches: string[] = [];

      for (const file of files) {
        if (matches.length >= 25) break;
        try {
          const content = fs.readFileSync(file, "utf8");
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              const rel = path.relative(root, file);
              matches.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 140)}`);
              if (matches.length >= 25) break;
            }
          }
        } catch {
        }
      }

      if (matches.length === 0) {
        return `No occurrences of pattern '${pattern}' found in scanned project.`;
      }

      return matches.join("\n");
    } catch (err: any) {
      return `Search error: ${err.message || String(err)}`;
    }
  }

  if (normalizedTool === "get_call_sites") {
    const functionName = String(args.function_name || "").trim();
    if (!functionName) {
      return "Error: Missing required argument 'function_name'.";
    }

    try {
      const escaped = functionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const callRegex = new RegExp(`(?:\\b${escaped}\\s*\\(|<${escaped}\\b)`);
      const files = discoverProjectFiles(root);
      const callSites: string[] = [];

      for (const file of files) {
        if (callSites.length >= 25) break;
        try {
          const content = fs.readFileSync(file, "utf8");
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (callRegex.test(lines[i])) {
              const rel = path.relative(root, file);
              callSites.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 140)}`);
              if (callSites.length >= 25) break;
            }
          }
        } catch {
        }
      }

      if (callSites.length === 0) {
        return `No invocation call sites found for function '${functionName}'.`;
      }

      return callSites.join("\n");
    } catch (err: any) {
      return `Call site lookup error: ${err.message || String(err)}`;
    }
  }

  return `Error: Unknown tool '${toolName}'. Supported tools are: read_file, search_codebase, get_call_sites.`;
}
