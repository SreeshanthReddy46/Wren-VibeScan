import test from "node:test";
import assert from "node:assert/strict";
import { validateCodeSyntax } from "../../dist/index.js";

test("validateCodeSyntax approves valid TypeScript code", () => {
  const result = validateCodeSyntax("const x: number = 42;\nexport default x;");
  assert.equal(result.isValid, true);
  assert.equal(result.error, undefined);
});

test("validateCodeSyntax approves valid JSX/TSX component", () => {
  const code = `
    import React from "react";
    export function Header({ title }: { title: string }) {
      return <h1>{title}</h1>;
    }
  `;
  const result = validateCodeSyntax(code, "Component.tsx");
  assert.equal(result.isValid, true);
});

test("validateCodeSyntax rejects invalid code with syntax error", () => {
  const result = validateCodeSyntax("const x: = ;");
  assert.equal(result.isValid, false);
  assert.ok(result.error);
});
