import * as fs from "fs";
import * as path from "path";
import type {
  CodebaseToolDefinition,
  CodebaseTools,
  ToolCallRequest,
  ToolCallResult,
} from "./types";

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
]);

const MAX_READ_LINES = 200;
const MAX_SEARCH_RESULTS = 15;
const MAX_CALL_SITES = 10;

export const TOOL_DEFINITIONS: CodebaseToolDefinition[] = [
  {
    name: "read_file",
    description:
      "Reads file content from the workspace with line numbers. Use this to inspect source code, middleware, auth guards, or configuration.",
    input_schema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Relative path to the file within the repository (e.g. 'app/api/users/route.ts' or 'middleware.ts').",
        },
        startLine: {
          type: "integer",
          description: "Optional 1-indexed starting line number.",
        },
        endLine: {
          type: "integer",
          description: "Optional 1-indexed ending line number.",
        },
      },
      required: ["filePath"],
    },
  },
  {
    name: "search_codebase",
    description:
      "Searches the repository source files for a substring or regex pattern. Use this to find where variables, routes, or auth methods are defined.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text or pattern to search for across the repository.",
        },
        fileExtension: {
          type: "string",
          description: "Optional extension filter (e.g. '.ts', '.tsx', '.js').",
        },
        isRegex: {
          type: "boolean",
          description: "Set to true if query is a regular expression pattern.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_call_sites",
    description:
      "Finds call sites, imports, and usages of a specific function, middleware, or identifier across the codebase.",
    input_schema: {
      type: "object",
      properties: {
        identifier: {
          type: "string",
          description: "The name of the function, middleware, or token to locate (e.g. 'withAuth', 'verifySession').",
        },
      },
      required: ["identifier"],
    },
  },
];

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getAllFiles(fullPath, baseDir));
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  } catch {

  }
  return results;
}

export function createCodebaseTools(targetPath: string): CodebaseTools {
  const rootDir = path.resolve(targetPath);

  function ensureSafePath(filePath: string): { safePath: string; error?: string } {
    const resolved = path.resolve(rootDir, filePath);
    if (resolved !== rootDir && !resolved.startsWith(rootDir + path.sep)) {
      return { safePath: resolved, error: "Access denied: path traverses outside workspace" };
    }
    return { safePath: resolved };
  }

  async function readFileTool(args: Record<string, unknown>): Promise<ToolCallResult> {
    const rawPath = String(args.filePath || "");
    const { safePath, error } = ensureSafePath(rawPath);
    if (error) {
      return { toolName: "read_file", success: false, content: "", error };
    }

    if (!fs.existsSync(safePath) || !fs.statSync(safePath).isFile()) {
      return {
        toolName: "read_file",
        success: false,
        content: "",
        error: `File not found: ${rawPath}`,
      };
    }

    try {
      const content = fs.readFileSync(safePath, "utf-8");
      const lines = content.split(/\r?\n/);
      const startLine = Math.max(1, typeof args.startLine === "number" ? args.startLine : 1);
      const endLine =
        typeof args.endLine === "number"
          ? Math.min(lines.length, args.endLine)
          : Math.min(lines.length, startLine + MAX_READ_LINES - 1);

      const sliced = lines
        .slice(startLine - 1, endLine)
        .map((line, idx) => `${startLine + idx}: ${line}`)
        .join("\n");

      return {
        toolName: "read_file",
        success: true,
        content: sliced || "[Empty file content]",
      };
    } catch (err) {
      return {
        toolName: "read_file",
        success: false,
        content: "",
        error: `Error reading file: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  async function searchCodebaseTool(args: Record<string, unknown>): Promise<ToolCallResult> {
    const query = String(args.query || "");
    if (!query) {
      return { toolName: "search_codebase", success: false, content: "", error: "Missing search query" };
    }

    const fileExt = typeof args.fileExtension === "string" ? args.fileExtension : "";
    const isRegex = Boolean(args.isRegex);

    let regex: RegExp;
    try {
      regex = isRegex ? new RegExp(query, "i") : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    } catch (err) {
      return {
        toolName: "search_codebase",
        success: false,
        content: "",
        error: `Invalid regex: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    const files = getAllFiles(rootDir);
    const matches: string[] = [];

    for (const file of files) {
      if (fileExt && !file.endsWith(fileExt)) continue;
      try {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split(/\r?\n/);
        const relPath = path.relative(rootDir, file).replace(/\\/g, "/");

        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            matches.push(`${relPath}:${i + 1}: ${lines[i].trim()}`);
            if (matches.length >= MAX_SEARCH_RESULTS) break;
          }
        }
      } catch {

      }
      if (matches.length >= MAX_SEARCH_RESULTS) break;
    }

    return {
      toolName: "search_codebase",
      success: true,
      content: matches.length > 0 ? matches.join("\n") : "No matches found.",
    };
  }

  async function getCallSitesTool(args: Record<string, unknown>): Promise<ToolCallResult> {
    const identifier = String(args.identifier || "").trim();
    if (!identifier) {
      return { toolName: "get_call_sites", success: false, content: "", error: "Missing identifier" };
    }

    const pattern = new RegExp(`\\b${identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    const files = getAllFiles(rootDir);
    const callSites: string[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split(/\r?\n/);
        const relPath = path.relative(rootDir, file).replace(/\\/g, "/");

        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            callSites.push(`${relPath}:${i + 1}: ${lines[i].trim()}`);
            if (callSites.length >= MAX_CALL_SITES) break;
          }
        }
      } catch {

      }
      if (callSites.length >= MAX_CALL_SITES) break;
    }

    return {
      toolName: "get_call_sites",
      success: true,
      content: callSites.length > 0 ? callSites.join("\n") : `No call sites found for identifier '${identifier}'.`,
    };
  }

  return {
    definitions: TOOL_DEFINITIONS,
    async execute(request: ToolCallRequest): Promise<ToolCallResult> {
      switch (request.toolName) {
        case "read_file":
          return readFileTool(request.args);
        case "search_codebase":
          return searchCodebaseTool(request.args);
        case "get_call_sites":
          return getCallSitesTool(request.args);
        default:
          return {
            toolName: request.toolName,
            success: false,
            content: "",
            error: `Unknown tool: ${request.toolName}`,
          };
      }
    },
  };
}
