import test from "node:test";
import assert from "node:assert/strict";
import { generateRemediationPatch } from "../../dist/index.js";
import type { Finding } from "@wren/shared-types";

test("generateRemediationPatch replaces raw secret with process.env and sanitizes", async () => {
  const rawSecret = "sk-proj-123456789012345678901234567890";
  const sampleFinding: Finding = {
    id: "f-sec-1",
    ruleId: "WREN-SEC-001",
    category: "secret",
    severity: "critical",
    title: "Hardcoded OpenAI Secret Key Exposed",
    message: "Exposed OpenAI key",
    plainEnglishExplanation: "Secrets in source code can be extracted.",
    location: {
      filePath: "src/openai.ts",
      startLine: 2,
      endLine: 2,
      snippet: `apiKey: "${rawSecret}",`,
    },
    fix: {
      description: "Use process.env.OPENAI_API_KEY",
      replacementCode: "apiKey: process.env.OPENAI_API_KEY,",
    },
  };

  const fileContent = `import OpenAI from "openai";\nconst client = new OpenAI({ apiKey: "${rawSecret}" });\nexport default client;\n`;

  const patch = await generateRemediationPatch(sampleFinding, {
    fileContent,
  });

  assert.equal(patch.isValid, true);
  assert.ok(patch.diff.includes("process.env.OPENAI_API_KEY"));

  assert.equal(patch.diff.includes(rawSecret), false);
  assert.equal(patch.patchedContent.includes(rawSecret), false);
  assert.ok(patch.branchName.startsWith("wren/fix-"));
});

test("generateRemediationPatch fixes missing auth check", async () => {
  const sampleFinding: Finding = {
    id: "f-auth-1",
    ruleId: "WREN-AUTH-001",
    category: "auth",
    severity: "high",
    title: "Route Handler Missing Authentication Check",
    message: "Missing session check",
    plainEnglishExplanation: "Public route allows unauthenticated access.",
    location: {
      filePath: "src/api/delete.ts",
      startLine: 1,
      endLine: 1,
      snippet: "export async function POST(req: Request) {",
    },
    fix: {
      description: "Add auth check",
      replacementCode:
        'export async function POST(req: Request) {\n  const session = await auth();\n  if (!session) return new Response("Unauthorized", { status: 401 });',
    },
  };

  const fileContent = "export async function POST(req: Request) {\n  return Response.json({ ok: true });\n}\n";

  const patch = await generateRemediationPatch(sampleFinding, {
    fileContent,
  });

  assert.equal(patch.isValid, true);
  assert.ok(patch.patchedContent.includes("session = await auth()"));
});
