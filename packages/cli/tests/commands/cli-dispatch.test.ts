import test from "node:test";
import assert from "node:assert/strict";
import { shouldLaunchTui } from "../../dist/index.js";

test("shouldLaunchTui returns true for empty args in interactive TTY", () => {
  const result = shouldLaunchTui([], true, false);
  assert.strictEqual(result, true);
});

test("shouldLaunchTui returns false when CI is set", () => {
  const result = shouldLaunchTui([], true, true);
  assert.strictEqual(result, false);
});

test("shouldLaunchTui returns false when stdout is not TTY", () => {
  const result = shouldLaunchTui([], false, false);
  assert.strictEqual(result, false);
});

test("shouldLaunchTui returns false when subcommand check is provided", () => {
  const result = shouldLaunchTui(["check"], true, false);
  assert.strictEqual(result, false);
});

test("shouldLaunchTui returns false when help or version flags are passed", () => {
  assert.strictEqual(shouldLaunchTui(["--help"], true, false), false);
  assert.strictEqual(shouldLaunchTui(["-v"], true, false), false);
});
