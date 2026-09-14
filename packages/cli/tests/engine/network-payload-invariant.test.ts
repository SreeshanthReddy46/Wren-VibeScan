import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runDeepReasoningLoop } from "../../dist/index.js";
import type { Finding } from "@wren/shared-types";

test("Network Egress Invariant: only flagged snippet is sent to Claude, never full file or repo tree", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-egress-test-"));
  const fullFileContent = Array.from(
    { length: 200 },
    (_, i) => `export function lineFunction${i}() { return "safe code block ${i}"; }`
  ).join("\n");

  const targetFilePath = path.join(tempDir, "large-service.ts");
  fs.writeFileSync(targetFilePath, fullFileContent, "utf8");

  const unflaggedFilePath = path.join(tempDir, "unflagged-secret-vault.ts");
  fs.writeFileSync(
    unflaggedFilePath,
    "export const PROPRIETARY_CODE = 'intellectual property never to be sent';",
    "utf8"
  );

  const localizedSnippet = "const rawApiKey = 'sk-proj-test1234567890';";

  const finding: Finding = {
    id: "f-egress-1",
    ruleId: "WREN-SEC-001",
    category: "secret",
    severity: "critical",
    title: "Exposed Secret",
    message: "Hardcoded API key",
    plainEnglishExplanation: "Private key in source",
    location: {
      filePath: "large-service.ts",
      startLine: 45,
      endLine: 45,
      snippet: localizedSnippet,
    },
    fix: {
      description: "Use process.env",
      replacementCode: "process.env.API_KEY",
    },
  };

  const capturedPayloads: any[] = [];

  const mockClient = {
    messages: {
      create: async (params: any) => {
        capturedPayloads.push(params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                verdict: "TRUE_POSITIVE",
                confidence: 0.95,
                explanation: "Confirmed exposed key.",
              }),
            },
          ],
        };
      },
    },
  };

  try {
    const result = await runDeepReasoningLoop(finding, {
      injectedClient: mockClient,
      targetPath: tempDir,
    });

    assert.strictEqual(result.verdict, "TRUE_POSITIVE");
    assert.strictEqual(capturedPayloads.length, 1);

    const firstPayload = capturedPayloads[0];
    const userMessage = firstPayload.messages[0].content as string;

    assert.ok(
      userMessage.includes(localizedSnippet),
      "Initial prompt must include the localized snippet"
    );

    assert.strictEqual(
      userMessage.includes(fullFileContent),
      false,
      "Initial prompt must NOT include the full file content"
    );

    assert.strictEqual(
      userMessage.includes("intellectual property never to be sent"),
      false,
      "Initial prompt must NOT contain contents from unflagged repository files"
    );

    assert.strictEqual(
      userMessage.includes("unflagged-secret-vault.ts"),
      false,
      "Initial prompt must NOT contain full directory listings of unflagged files"
    );

    assert.ok(
      userMessage.length < 3000,
      "Initial prompt payload must be compact and bounded"
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
