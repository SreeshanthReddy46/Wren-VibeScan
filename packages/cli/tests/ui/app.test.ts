import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { render } from "ink-testing-library";
import type { Finding } from "@wren/shared-types";
import { App } from "../../dist/index.js";

test("App renders initial scan results and supports keyboard inputs", () => {
  const initialFindings: Finding[] = [
    {
      ruleId: "R1",
      severity: "critical",
      title: "Crit Issue",
      plainEnglishExplanation: "Explanation 1",
      location: { filePath: "a.ts", startLine: 1, endLine: 1 },
    },
    {
      ruleId: "R2",
      severity: "medium",
      title: "Med Issue",
      plainEnglishExplanation: "Explanation 2",
      location: { filePath: "b.ts", startLine: 2, endLine: 2 },
    },
  ];

  const { lastFrame, stdin } = render(
    React.createElement(App, {
      targetPath: ".",
      initialFindings,
      onExit: () => {},
    })
  );

  let frame = lastFrame() || "";
  assert.strictEqual(frame.includes("Crit Issue"), true);

  stdin.write("f");
  frame = lastFrame() || "";
  assert.strictEqual(frame.includes("Fix Preview"), true);
});
