import * as crypto from "crypto";

export function normalizeSnippet(code: string): string {
  if (!code) return "";

  let cleaned = code.replace(/\/\*[\s\S]*?\*\//g, "");

  cleaned = cleaned.replace(/\/\/[^\n\r]*/g, "");

  return cleaned.replace(/\s+/g, " ").trim();
}

export function computeCodeHash(ruleId: string, snippet: string): string {
  const normalized = normalizeSnippet(snippet);
  const payload = `${ruleId.trim()}::${normalized}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}
