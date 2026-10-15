import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { render } from "ink-testing-library";
import { StatusBar, appendIgnoreRule } from "../../dist/index.js";

test("StatusBar renders keyboard shortcut legend", () => {
  const { lastFrame } = render(
    React.createElement(StatusBar, { ignoreActive: false, feedback: null })
  );
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("[↑/↓] Navigate"), true);
  assert.strictEqual(frame.includes("[e] Explain"), true);
  assert.strictEqual(frame.includes("[f] Fix"), true);
  assert.strictEqual(frame.includes("[i] Ignore"), true);
  assert.strictEqual(frame.includes("[q] Quit"), true);
});

test("StatusBar renders ignore prompt when active", () => {
  const { lastFrame } = render(
    React.createElement(StatusBar, { ignoreActive: true, feedback: null })
  );
  const frame = lastFrame() || "";
  assert.strictEqual(frame.includes("[s] Session only"), true);
  assert.strictEqual(frame.includes("[p] Persist to .wrenignore"), true);
  assert.strictEqual(frame.includes("[Esc] Cancel"), true);
});

test("appendIgnoreRule writes rule and path entry to .wrenignore", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-ignore-test-"));
  try {
    appendIgnoreRule(tempDir, "src/key.ts", "WREN-SEC-001");
    const content = fs.readFileSync(path.join(tempDir, ".wrenignore"), "utf8");
    assert.strictEqual(content.includes("src/key.ts"), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
