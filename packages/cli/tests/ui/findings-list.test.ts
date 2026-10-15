import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import type { Finding } from "@wren/shared-types";
import { Header, FindingsList } from "../../dist/index.js";

test("Header renders issue count and severity breakdown", () => {
  const findings: Finding[] = [
    {
      ruleId: "R1",
      severity: "critical",
      title: "C1",
      plainEnglishExplanation: "E1",
      location: { filePath: "a.ts", startLine: 1, endLine: 1 },
    },
    {
      ruleId: "R2",
      severity: "high",
      title: "H1",
      plainEnglishExplanation: "E2",
      location: { filePath: "b.ts", startLine: 2, endLine: 2 },
    },
  ];

  const { lastFrame } = render(React.createElement(Header, { findings, targetPath: "." }));
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("Total: 2"), true);
  assert.strictEqual(frame.includes("1 Critical"), true);
  assert.strictEqual(frame.includes("1 High"), true);
});

test("FindingsList renders active item indicator", () => {
  const findings: Finding[] = [
    {
      ruleId: "R1",
      severity: "critical",
      title: "Active Finding",
      plainEnglishExplanation: "E1",
      location: { filePath: "a.ts", startLine: 10, endLine: 10 },
    },
  ];

  const { lastFrame } = render(
    React.createElement(FindingsList, {
      findings,
      selectedIndex: 0,
      windowOffset: 0,
      maxVisible: 10,
    })
  );
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("Active Finding"), true);
  assert.strictEqual(frame.includes("CRITICAL"), true);
  assert.strictEqual(frame.includes("a.ts:10"), true);
});
