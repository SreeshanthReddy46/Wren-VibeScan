import test from "node:test";
import assert from "node:assert/strict";
import { enterAlternateScreen, exitAlternateScreen } from "../../dist/index.js";

test("enterAlternateScreen writes escape sequence when TTY", () => {
  let output = "";
  const mockStream = {
    isTTY: true,
    write: (chunk: string) => {
      output += chunk;
      return true;
    },
  };

  enterAlternateScreen(mockStream as any);
  assert.strictEqual(output.includes("\x1b[?1049h"), true);
});

test("exitAlternateScreen writes restore sequence when TTY", () => {
  let output = "";
  const mockStream = {
    isTTY: true,
    write: (chunk: string) => {
      output += chunk;
      return true;
    },
  };

  exitAlternateScreen(mockStream as any);
  assert.strictEqual(output.includes("\x1b[?1049l"), true);
});

test("screen buffer helpers do nothing when not TTY", () => {
  let output = "";
  const mockStream = {
    isTTY: false,
    write: (chunk: string) => {
      output += chunk;
      return true;
    },
  };

  enterAlternateScreen(mockStream as any);
  exitAlternateScreen(mockStream as any);
  assert.strictEqual(output, "");
});
