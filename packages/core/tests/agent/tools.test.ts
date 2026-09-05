import test from "node:test";
import assert from "node:assert/strict";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { createCodebaseTools } from "../../dist/index.js";

test("CodebaseTools rejects path traversal outside targetPath", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-test-"));
  const tools = createCodebaseTools(tempDir);

  const result = await tools.execute({
    toolName: "read_file",
    args: { filePath: "../../../package.json" },
  });

  assert.equal(result.success, false);
  assert.match(result.error || "", /Access denied: path traverses outside workspace/);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("CodebaseTools read_file reads slice of file with line numbers", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-test-"));
  const sampleFile = path.join(tempDir, "sample.ts");
  fs.writeFileSync(sampleFile, "line 1\nline 2\nline 3\nline 4\nline 5\n");

  const tools = createCodebaseTools(tempDir);
  const result = await tools.execute({
    toolName: "read_file",
    args: { filePath: "sample.ts", startLine: 2, endLine: 4 },
  });

  assert.equal(result.success, true);
  assert.match(result.content, /2: line 2/);
  assert.match(result.content, /4: line 4/);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("CodebaseTools search_codebase finds matching occurrences", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-test-"));
  fs.writeFileSync(path.join(tempDir, "auth.ts"), "export function verifySession() {}\n");
  fs.writeFileSync(path.join(tempDir, "ignored.txt"), "hello world\n");

  const tools = createCodebaseTools(tempDir);
  const result = await tools.execute({
    toolName: "search_codebase",
    args: { query: "verifySession" },
  });

  assert.equal(result.success, true);
  assert.match(result.content, /auth\.ts:1: export function verifySession\(\)/);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test("CodebaseTools get_call_sites identifies import and call locations", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-test-"));
  fs.writeFileSync(path.join(tempDir, "middleware.ts"), "import { verifyToken } from './auth';\nverifyToken(req);\n");

  const tools = createCodebaseTools(tempDir);
  const result = await tools.execute({
    toolName: "get_call_sites",
    args: { identifier: "verifyToken" },
  });

  assert.equal(result.success, true);
  assert.match(result.content, /middleware\.ts:1/);
  assert.match(result.content, /middleware\.ts:2/);
  fs.rmSync(tempDir, { recursive: true, force: true });
});
