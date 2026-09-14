import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { executeAgentTool, createCodebaseTools } from "../../dist/index.js";

test("Read-Only Enforcement: agent tools strictly reject mutation and execution attempts", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-readonly-test-"));
  const sampleFile = path.join(tempDir, "service.ts");
  fs.writeFileSync(sampleFile, "export const appStatus = 'running';", "utf8");

  try {
    const writeResult = executeAgentTool(
      "write_file",
      { path: "service.ts", content: "malicious code" },
      tempDir
    );
    assert.ok(
      writeResult.includes("Security Error: Mutation and execution tools are strictly prohibited."),
      "write_file must be rejected with Security Error"
    );

    const deleteResult = executeAgentTool(
      "delete_file",
      { path: "service.ts" },
      tempDir
    );
    assert.ok(
      deleteResult.includes("Security Error: Mutation and execution tools are strictly prohibited."),
      "delete_file must be rejected with Security Error"
    );

    const execResult = executeAgentTool(
      "exec",
      { command: "whoami" },
      tempDir
    );
    assert.ok(
      execResult.includes("Security Error: Mutation and execution tools are strictly prohibited."),
      "exec must be rejected with Security Error"
    );

    const evalResult = executeAgentTool(
      "eval",
      { code: "process.exit(1)" },
      tempDir
    );
    assert.ok(
      evalResult.includes("Security Error: Mutation and execution tools are strictly prohibited."),
      "eval must be rejected with Security Error"
    );

    const currentContent = fs.readFileSync(sampleFile, "utf8");
    assert.strictEqual(
      currentContent,
      "export const appStatus = 'running';",
      "File content must not be modified by blocked write calls"
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Credential and Secret File Protection: agent tools block access to sensitive configs", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-secrets-block-"));
  fs.writeFileSync(path.join(tempDir, ".env"), "SECRET_KEY=12345", "utf8");
  fs.writeFileSync(path.join(tempDir, ".env.production"), "DATABASE_URL=postgres://...", "utf8");
  fs.writeFileSync(path.join(tempDir, "id_rsa"), "-----BEGIN RSA PRIVATE KEY-----", "utf8");

  const gitDir = path.join(tempDir, ".git");
  fs.mkdirSync(gitDir);
  fs.writeFileSync(path.join(gitDir, "config"), "[core]\nrepositoryformatversion = 0", "utf8");

  try {
    const envResult = executeAgentTool("read_file", { path: ".env" }, tempDir);
    assert.ok(
      envResult.includes("Security Error: Access to credential and secret files is strictly prohibited."),
      ".env reading must be blocked"
    );

    const envProdResult = executeAgentTool("read_file", { path: ".env.production" }, tempDir);
    assert.ok(
      envProdResult.includes("Security Error: Access to credential and secret files is strictly prohibited."),
      ".env.production reading must be blocked"
    );

    const rsaResult = executeAgentTool("read_file", { path: "id_rsa" }, tempDir);
    assert.ok(
      rsaResult.includes("Security Error: Access to credential and secret files is strictly prohibited."),
      "id_rsa reading must be blocked"
    );

    const gitResult = executeAgentTool("read_file", { path: ".git/config" }, tempDir);
    assert.ok(
      gitResult.includes("Security Error: Access to credential and secret files is strictly prohibited."),
      ".git/config reading must be blocked"
    );

    const searchResult = executeAgentTool("search_codebase", { pattern: "SECRET_KEY" }, tempDir);
    assert.ok(
      !searchResult.includes("12345"),
      "search_codebase must not expose values from sensitive credential files"
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Path Traversal Protection: agent tools reject paths outside workspace root", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-traversal-test-"));

  try {
    const traversalResult = executeAgentTool(
      "read_file",
      { path: "../../etc/passwd" },
      tempDir
    );
    assert.ok(
      traversalResult.includes("Security Error: Path traversal outside the scanned project is strictly forbidden."),
      "Relative path traversal must be rejected"
    );

    const absTraversalResult = executeAgentTool(
      "read_file",
      { path: path.resolve(tempDir, "..", "outside-secret.txt") },
      tempDir
    );
    assert.ok(
      absTraversalResult.includes("Security Error: Path traversal outside the scanned project is strictly forbidden."),
      "Absolute path escaping root must be rejected"
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Core Codebase Tools: enforce read-only boundary and secret masking", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-core-tools-"));
  const safeFile = path.join(tempDir, "safe.ts");
  fs.writeFileSync(safeFile, "export const safe = true;\nconst secondLine = 2;\n", "utf8");
  fs.writeFileSync(path.join(tempDir, ".env"), "API_SECRET=leak", "utf8");

  try {
    const tools = createCodebaseTools(tempDir);

    const writeExec = await tools.execute({
      toolName: "write_file",
      args: { filePath: "safe.ts", content: "override" },
    });
    assert.strictEqual(writeExec.success, false);
    assert.ok(
      writeExec.error?.includes("Security Error: Mutation and execution tools are strictly prohibited."),
      "Core tools execute must block mutation tools"
    );

    const readEnv = await tools.execute({
      toolName: "read_file",
      args: { filePath: ".env" },
    });
    assert.strictEqual(readEnv.success, false);
    assert.ok(
      readEnv.error?.includes("Security Error: Access to credential and secret files is strictly prohibited."),
      "Core tools execute must block reading .env"
    );

    const readTraversal = await tools.execute({
      toolName: "read_file",
      args: { filePath: "../../etc/shadow" },
    });
    assert.strictEqual(readTraversal.success, false);
    assert.ok(
      readTraversal.error?.includes("Access denied: path traverses outside workspace"),
      "Core tools execute must block path traversal"
    );

    const readSafe = await tools.execute({
      toolName: "read_file",
      args: { filePath: "safe.ts", startLine: 1, endLine: 2 },
    });
    assert.strictEqual(readSafe.success, true);
    assert.ok(readSafe.content.includes("export const safe = true;"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
