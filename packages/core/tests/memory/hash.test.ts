import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSnippet, computeCodeHash } from "../../dist/index.js";

test("normalizeSnippet removes comments and normalizes whitespace", () => {
  const code1 = "  const a = 1; // sample\n  return a;  ";
  const code2 = "const a = 1;\nreturn a;";
  assert.equal(normalizeSnippet(code1), normalizeSnippet(code2));
});

test("computeCodeHash produces identical hash for equivalent code", () => {
  const hash1 = computeCodeHash("AUTH_RULE", "export function GET() { return check(); }");
  const hash2 = computeCodeHash("AUTH_RULE", "  export function GET() {\n    return check();\n  }  ");
  assert.equal(hash1, hash2);
});

test("computeCodeHash produces different hashes for different rules or code", () => {
  const hash1 = computeCodeHash("RULE_A", "export function GET() {}");
  const hash2 = computeCodeHash("RULE_B", "export function GET() {}");
  const hash3 = computeCodeHash("RULE_A", "export function POST() {}");

  assert.notEqual(hash1, hash2);
  assert.notEqual(hash1, hash3);
});
