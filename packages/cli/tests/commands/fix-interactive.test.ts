import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { Finding } from "@wren/shared-types";
import { runFixCommand } from "../../dist/index.js";

const sampleFinding: Finding = {
  id: "finding-fix-auto",
  ruleId: "hardcoded-secret",
  category: "secret",
  severity: "critical",
  title: "Hardcoded API Key",
  message: "Hardcoded secret key exposed",
  plainEnglishExplanation: "Exposed secret",
  location: {
    filePath: "client.ts",
    startLine: 1,
    endLine: 1,
    snippet: 'const apiKey = "sk-proj-test123456789";',
  },
  fix: {
    description: "Move key to environment variable",
    replacementCode: "const apiKey = process.env.API_KEY;",
  },
};

test("runFixCommand with --yes applies patch immediately without prompting", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-fix-test-"));
  const targetFile = path.join(tempDir, "client.ts");
  fs.writeFileSync(targetFile, 'const apiKey = "sk-proj-test123456789";\n', "utf8");

  try {
    const exitCode = await runFixCommand(sampleFinding.id, {
      targetPath: tempDir,
      finding: sampleFinding,
      yes: true,
    });
    assert.strictEqual(exitCode, 0);

    const updated = fs.readFileSync(targetFile, "utf8");
    assert.ok(updated.includes("process.env.API_KEY"));
    assert.ok(!updated.includes("sk-proj-test123456789"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("runFixCommand in non-interactive mode without --yes leaves file unmodified", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-fix-test-"));
  const targetFile = path.join(tempDir, "client.ts");
  const initialContent = 'const apiKey = "sk-proj-test123456789";\n';
  fs.writeFileSync(targetFile, initialContent, "utf8");

  const originalIsTTY = process.stdin.isTTY;
  process.stdin.isTTY = false;

  try {
    const exitCode = await runFixCommand(sampleFinding.id, {
      targetPath: tempDir,
      finding: sampleFinding,
    });
    assert.strictEqual(exitCode, 0);

    const content = fs.readFileSync(targetFile, "utf8");
    assert.strictEqual(content, initialContent);
  } finally {
    process.stdin.isTTY = originalIsTTY;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
