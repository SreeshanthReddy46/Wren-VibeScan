import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePatternForGlobalMemory } from "../../dist/index.js";

test("sanitizePatternForGlobalMemory redacts secrets, emails, and absolute paths", () => {
  const dirtySnippet = `
    const stripe = new Stripe("sk_live_51Abcdef1234567890XYZ");
    const contact = "admin@mycompany.internal";
    // File: /Users/hp/secret-project/app/api/auth.ts
  `;
  const dirtyRationale = "Verified leak in /Users/hp/secret-project/lib/auth.ts for admin@mycompany.internal";

  const { sanitizedSnippet, sanitizedRationale } = sanitizePatternForGlobalMemory(dirtySnippet, dirtyRationale);

  assert.doesNotMatch(sanitizedSnippet, /sk_live_/);
  assert.doesNotMatch(sanitizedSnippet, /admin@mycompany\.internal/);
  assert.doesNotMatch(sanitizedSnippet, /\/Users\/hp/);
  assert.match(sanitizedSnippet, /<REDACTED_SECRET>/);
  assert.match(sanitizedSnippet, /<USER_EMAIL>/);

  assert.doesNotMatch(sanitizedRationale, /\/Users\/hp/);
  assert.doesNotMatch(sanitizedRationale, /admin@mycompany\.internal/);
});

test("sanitizePatternForGlobalMemory leaves benign code structure intact", () => {
  const cleanCode = "export function verifySession(token: string) { return jwt.verify(token); }";
  const { sanitizedSnippet } = sanitizePatternForGlobalMemory(cleanCode, "Verified");
  assert.match(sanitizedSnippet, /verifySession/);
});
