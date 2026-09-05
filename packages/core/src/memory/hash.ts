import * as crypto from "crypto";

/**
 * Normalizes code snippets so minor formatting differences, line endings,
 * indentation, whitespace, and comments do not prevent exact Tier 1 cache hits.
 */
export function normalizeSnippet(code: string): string {
  if (!code) return "";

  // 1. Remove multiline comments /* ... */
  let cleaned = code.replace(/\/\*[\s\S]*?\*\//g, "");

  // 2. Remove single-line comments // ...
  cleaned = cleaned.replace(/\/\/[^\n\r]*/g, "");

  // 3. Collapse all whitespace (newlines, tabs, spaces) into single spaces and trim
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Computes a deterministic SHA-256 hash for a normalized code snippet and rule ID.
 */
export function computeCodeHash(ruleId: string, snippet: string): string {
  const normalized = normalizeSnippet(snippet);
  const payload = `${ruleId.trim()}::${normalized}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}
