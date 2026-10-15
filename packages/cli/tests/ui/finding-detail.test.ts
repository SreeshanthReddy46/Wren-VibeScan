import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import type { Finding } from "@wren/shared-types";
import { FindingDetail } from "../../dist/index.js";

test("FindingDetail renders overview and reasoning tab", () => {
  const finding: Finding = {
    ruleId: "WREN-SEC-001",
    cwe: "CWE-798",
    severity: "critical",
    title: "Hardcoded API Key",
    plainEnglishExplanation: "An active secret token was found hardcoded.",
    location: {
      filePath: "src/auth.ts",
      startLine: 14,
      endLine: 14,
      snippet: 'const apiKey = "sk-proj-12345";',
    },
  };

  const { lastFrame } = render(
    React.createElement(FindingDetail, { finding, activeTab: "overview" })
  );
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("WREN-SEC-001"), true);
  assert.strictEqual(frame.includes("CWE-798"), true);
  assert.strictEqual(frame.includes("src/auth.ts:14"), true);
  assert.strictEqual(frame.includes("An active secret token was found"), true);
  assert.strictEqual(frame.includes('const apiKey = "sk-proj-12345";'), true);
});

test("FindingDetail renders fix preview tab when active", () => {
  const finding: Finding = {
    ruleId: "WREN-SEC-001",
    severity: "critical",
    title: "Hardcoded API Key",
    plainEnglishExplanation: "Explanation",
    location: { filePath: "src/auth.ts", startLine: 14, endLine: 14 },
    fix: {
      description: "Use environment variable",
      diff: '- const apiKey = "sk-proj-12345";\n+ const apiKey = process.env.API_KEY;',
    },
  };

  const { lastFrame } = render(
    React.createElement(FindingDetail, { finding, activeTab: "fix" })
  );
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("Use environment variable"), true);
  assert.strictEqual(frame.includes("+ const apiKey = process.env.API_KEY;"), true);
});
