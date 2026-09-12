import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  AGENT_TOOL_DEFINITIONS,
  executeAgentTool,
} from "../../dist/index.js";

test("AGENT_TOOL_DEFINITIONS defines strictly 3 read-only tools", () => {
  assert.equal(AGENT_TOOL_DEFINITIONS.length, 3);
  const names = AGENT_TOOL_DEFINITIONS.map((t) => t.name);
  assert.ok(names.includes("read_file"));
  assert.ok(names.includes("search_codebase"));
  assert.ok(names.includes("get_call_sites"));

  for (const tool of AGENT_TOOL_DEFINITIONS) {
    assert.match(tool.description.toLowerCase(), /strictly read-only/);
  }
});

test("executeAgentTool: read_file successfully reads file and blocks directory traversal", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-tool-test-"));
  const sampleFile = path.join(tmpDir, "sample.ts");
  fs.writeFileSync(sampleFile, "export const safe = true;\n", "utf8");

  try {
    const content = executeAgentTool("read_file", { path: "sample.ts" }, tmpDir);
    assert.equal(content, "export const safe = true;\n");

    const traversalAttempt = executeAgentTool(
      "read_file",
      { path: "../../../../../../../etc/passwd" },
      tmpDir
    );
    assert.match(traversalAttempt, /Security Error/i);

    const nonExistent = executeAgentTool(
      "read_file",
      { path: "missing.ts" },
      tmpDir
    );
    assert.match(nonExistent, /File not found/i);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("executeAgentTool: search_codebase finds pattern matches", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-search-test-"));
  const f1 = path.join(tmpDir, "routes.ts");
  const f2 = path.join(tmpDir, "auth.ts");
  fs.writeFileSync(f1, "import { authenticate } from './auth';\n", "utf8");
  fs.writeFileSync(f2, "export function authenticate() { return true; }\n", "utf8");

  try {
    const result = executeAgentTool(
      "search_codebase",
      { pattern: "authenticate" },
      tmpDir
    );
    assert.match(result, /routes\.ts:1:/);
    assert.match(result, /auth\.ts:1:/);

    const notFound = executeAgentTool(
      "search_codebase",
      { pattern: "nonExistentSymbol123" },
      tmpDir
    );
    assert.match(notFound, /No occurrences/i);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("executeAgentTool: get_call_sites locates invocation sites", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-callsites-test-"));
  const f1 = path.join(tmpDir, "handler.ts");
  fs.writeFileSync(
    f1,
    "function sanitizeInput(data: string) { return data; }\nconst clean = sanitizeInput(raw);\n",
    "utf8"
  );

  try {
    const result = executeAgentTool(
      "get_call_sites",
      { function_name: "sanitizeInput" },
      tmpDir
    );
    assert.match(result, /handler\.ts:2:/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
