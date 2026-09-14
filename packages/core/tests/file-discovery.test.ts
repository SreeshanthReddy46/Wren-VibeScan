import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { discoverFiles } from "../dist/index.js";

test("discoverFiles respects maxFiles cap", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-disc-test-"));
  try {
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(tempDir, `file-${i}.ts`), "export const x = 1;");
    }

    const discovered = discoverFiles(tempDir, [], { maxFiles: 2 });
    assert.strictEqual(discovered.length, 2);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("discoverFiles respects maxDepth limit and prevents deep recursion", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-depth-test-"));
  try {
    const subDir1 = path.join(tempDir, "sub1");
    const subDir2 = path.join(subDir1, "sub2");
    fs.mkdirSync(subDir1, { recursive: true });
    fs.mkdirSync(subDir2, { recursive: true });

    fs.writeFileSync(path.join(tempDir, "root.ts"), "export const root = true;");
    fs.writeFileSync(path.join(subDir1, "level1.ts"), "export const l1 = true;");
    fs.writeFileSync(path.join(subDir2, "level2.ts"), "export const l2 = true;");

    const depthZero = discoverFiles(tempDir, [], { maxDepth: 0 });
    assert.strictEqual(depthZero.length, 1);
    assert.strictEqual(depthZero[0].relativePath, "root.ts");

    const depthOne = discoverFiles(tempDir, [], { maxDepth: 1 });
    assert.strictEqual(depthOne.length, 2);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("discoverFiles handles malformed .wrenignore gracefully without throwing", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-ignore-test-"));
  try {
    fs.writeFileSync(path.join(tempDir, ".wrenignore"), "[invalid-character-class-***\0");
    fs.writeFileSync(path.join(tempDir, "app.ts"), "console.log('test');");

    const discovered = discoverFiles(tempDir);
    assert.ok(Array.isArray(discovered));
    assert.strictEqual(discovered.length, 1);
    assert.strictEqual(discovered[0].relativePath, "app.ts");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("discoverFiles handles non-existent or inaccessible directory without crashing", () => {
  const nonExistent = path.join(os.tmpdir(), "wren-non-existent-" + Date.now());
  const discovered = discoverFiles(nonExistent);
  assert.deepStrictEqual(discovered, []);
});
