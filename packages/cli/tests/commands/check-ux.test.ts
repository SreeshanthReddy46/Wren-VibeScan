import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runCheckCommand } from "../../dist/index.js";

test("runCheckCommand with --quiet runs silently without throwing", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-quiet-test-"));
  fs.writeFileSync(path.join(tempDir, "index.ts"), "export const x = 1;", "utf8");

  try {
    const exitCode = await runCheckCommand(tempDir, { quiet: true });
    assert.strictEqual(exitCode, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("runCheckCommand with --format table prints tabular output", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-table-test-"));
  fs.writeFileSync(path.join(tempDir, "index.ts"), "export const x = 1;", "utf8");

  try {
    const exitCode = await runCheckCommand(tempDir, { format: "table", quiet: true });
    assert.strictEqual(exitCode, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
