import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { Finding } from "@wren/shared-types";
import { runFixCommand, ExitCode } from "../../dist/index.js";

const mockSecretFinding: Finding = {
  id: "finding-secret-42",
  ruleId: "hardcoded-secret",
  category: "secret",
  severity: "critical",
  title: "Hardcoded OpenAI API Key",
  message: "Hardcoded secret key exposed in client bundle",
  plainEnglishExplanation: "Exposing secret keys allows unauthorized access to API accounts.",
  location: {
    filePath: "src/client.ts",
    startLine: 1,
    endLine: 1,
    snippet: 'const apiKey = "sk-proj-1234567890abcdef1234567890abcdef";',
  },
  fix: {
    description: "Move API key to environment variable",
    replacementCode: "const apiKey = process.env.OPENAI_API_KEY;",
  },
};

test("wren fix with --dry-run previews diff without modifying files", async () => {
  const originalLog = console.log;
  let loggedOutput = "";
  console.log = (msg: string) => {
    loggedOutput += msg + "\n";
  };

  try {
    const exitCode = await runFixCommand("finding-secret-42", {
      dryRun: true,
      finding: mockSecretFinding,
    });

    assert.equal(exitCode, ExitCode.SUCCESS);
    assert.match(loggedOutput, /process\.env\.OPENAI_API_KEY/);
    assert.match(loggedOutput, /--- a\/src\/client\.ts/);
    assert.match(loggedOutput, /\+\+\+ b\/src\/client\.ts/);
  } finally {
    console.log = originalLog;
  }
});

test("wren fix with --apply-locally writes patched code to file", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-fix-test-"));
  const tmpFile = path.join(tmpDir, "client.ts");
  fs.writeFileSync(
    tmpFile,
    'const apiKey = "sk-proj-1234567890abcdef1234567890abcdef";\nconsole.log(apiKey);\n',
    "utf-8"
  );

  const localFinding: Finding = {
    ...mockSecretFinding,
    location: {
      ...mockSecretFinding.location,
      filePath: "client.ts",
    },
  };

  try {
    const exitCode = await runFixCommand("finding-secret-42", {
      applyLocally: true,
      targetPath: tmpDir,
      finding: localFinding,
    });

    assert.equal(exitCode, ExitCode.SUCCESS);
    const updatedContent = fs.readFileSync(tmpFile, "utf-8");
    assert.ok(!updatedContent.includes("sk-proj-"), "Raw secret should be removed");
    assert.ok(
      updatedContent.includes("process.env.OPENAI_API_KEY"),
      "Should contain environment variable reference"
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("wren fix with --open-pr creates a pull request via remediation client", async () => {
  const originalLog = console.log;
  let loggedOutput = "";
  console.log = (msg: string) => {
    loggedOutput += msg + "\n";
  };

  try {
    const exitCode = await runFixCommand("finding-secret-42", {
      openPr: true,
      repo: "test-org/test-repo",
      finding: mockSecretFinding,
    });

    assert.equal(exitCode, ExitCode.SUCCESS);
    assert.match(loggedOutput, /pull request/i);
    assert.match(loggedOutput, /wren\/fix-/);
  } finally {
    console.log = originalLog;
  }
});
