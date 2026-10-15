import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { Finding } from "@wren/shared-types";
import {
  loadIgnoreStore,
  addIgnoreEntry,
  isFindingIgnored,
  migrateLegacyWrenignore,
} from "../../dist/index.js";

test("loadIgnoreStore returns empty store when no ignore file exists", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-ign-test-"));
  try {
    const store = loadIgnoreStore(tempDir);
    assert.strictEqual(store.version, "1.0.0");
    assert.strictEqual(store.ignores.length, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("addIgnoreEntry persists entry to .wren/ignore.json", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-ign-test-"));
  try {
    addIgnoreEntry(tempDir, {
      ruleId: "WREN-SEC-001",
      filePath: "src/api.ts",
      reason: "Test fixture mock",
    });

    const store = loadIgnoreStore(tempDir);
    assert.strictEqual(store.ignores.length, 1);
    assert.strictEqual(store.ignores[0].ruleId, "WREN-SEC-001");
    assert.strictEqual(store.ignores[0].filePath, "src/api.ts");
    assert.strictEqual(store.ignores[0].reason, "Test fixture mock");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("isFindingIgnored correctly matches rule and path", () => {
  const store = {
    version: "1.0.0",
    ignores: [
      {
        id: "ign-1",
        ruleId: "WREN-SEC-001",
        filePath: "src/api.ts",
        reason: "Test",
        ignoredAt: new Date().toISOString(),
      },
    ],
  };

  const matchingFinding: Finding = {
    ruleId: "WREN-SEC-001",
    severity: "critical",
    title: "Test",
    plainEnglishExplanation: "Test",
    location: { filePath: "src/api.ts", startLine: 1, endLine: 1 },
  };

  const nonMatchingFinding: Finding = {
    ruleId: "WREN-SEC-002",
    severity: "high",
    title: "Test",
    plainEnglishExplanation: "Test",
    location: { filePath: "src/api.ts", startLine: 1, endLine: 1 },
  };

  assert.strictEqual(isFindingIgnored(matchingFinding, store), true);
  assert.strictEqual(isFindingIgnored(nonMatchingFinding, store), false);
});

test("migrateLegacyWrenignore migrates lines from .wrenignore to .wren/ignore.json", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-mig-test-"));
  try {
    fs.writeFileSync(path.join(tempDir, ".wrenignore"), "tests/fixtures/**\nsrc/legacy.ts\n", "utf8");
    const migrated = migrateLegacyWrenignore(tempDir);
    assert.strictEqual(migrated, true);

    const store = loadIgnoreStore(tempDir);
    assert.strictEqual(store.ignores.length, 2);
    assert.strictEqual(store.ignores[0].filePath, "tests/fixtures/**");
    assert.strictEqual(store.ignores[1].filePath, "src/legacy.ts");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
