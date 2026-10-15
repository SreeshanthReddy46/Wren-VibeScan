import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { isWatchableFile, runWatchCommand } from "../../dist/index.js";

test("isWatchableFile returns true for source code files", () => {
  assert.strictEqual(isWatchableFile("src/index.ts"), true);
  assert.strictEqual(isWatchableFile("app/page.tsx"), true);
  assert.strictEqual(isWatchableFile("server.js"), true);
  assert.strictEqual(isWatchableFile(".env.local"), true);
});

test("isWatchableFile returns false for ignored directories", () => {
  assert.strictEqual(isWatchableFile("node_modules/pkg/index.js"), false);
  assert.strictEqual(isWatchableFile(".git/HEAD"), false);
  assert.strictEqual(isWatchableFile("dist/bundle.js"), false);
  assert.strictEqual(isWatchableFile(".wren/ignore.json"), false);
});

test("runWatchCommand performs initial scan with onceForTest", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-watch-test-"));
  fs.writeFileSync(path.join(tempDir, "sample.ts"), "const x = 1;\n", "utf8");
  try {
    await runWatchCommand(tempDir, { onceForTest: true });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
