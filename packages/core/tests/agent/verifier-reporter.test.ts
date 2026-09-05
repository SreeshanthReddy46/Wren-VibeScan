import test from "node:test";
import assert from "node:assert/strict";
import { verifyInvestigation } from "../../src/agent/verifier.ts";
import { synthesizeFindings } from "../../src/agent/reporter.ts";
import type { Finding } from "@wren/shared-types";
import type { InvestigationResult, VerificationResult } from "../../src/agent/types.ts";

test("verifier classifies finding as FALSE_POSITIVE when middleware mitigates it", async () => {
  const finding: Finding = {
    id: "f-1",
    ruleId: "AUTH_UNPROTECTED_ROUTE",
    category: "auth",
    severity: "high",
    title: "Unprotected Route",
    message: "No inline auth",
    plainEnglishExplanation: "Route handler",
    location: { filePath: "app/api/users/route.ts", startLine: 1, endLine: 5 },
    fix: { description: "Add auth", replacementCode: "" },
  };

  const investigation: InvestigationResult = {
    findingId: "f-1",
    completed: true,
    steps: [],
    gatheredContext: ["middleware.ts exports middleware that enforces session on /api/*"],
  };

  const mockClient = {
    messages: {
      create: async () => ({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              verdict: "FALSE_POSITIVE",
              rationale: "Global middleware.ts protects all /api/* routes, so missing inline auth is not vulnerable.",
              confidence: 0.95,
            }),
          },
        ],
      }),
    },
  };

  const verification = await verifyInvestigation(finding, investigation, { targetPath: "." }, mockClient as any);
  assert.equal(verification.verdict, "FALSE_POSITIVE");
  assert.match(verification.rationale, /middleware\.ts/);
});

test("reporter filters out false positives and enriches confirmed findings", () => {
  const findings: Finding[] = [
    {
      id: "f-1",
      ruleId: "AUTH_UNPROTECTED_ROUTE",
      category: "auth",
      severity: "high",
      title: "Unprotected Route",
      message: "No inline auth",
      plainEnglishExplanation: "Route handler",
      location: { filePath: "app/api/users/route.ts", startLine: 1, endLine: 5 },
      fix: { description: "Add auth", replacementCode: "" },
    },
    {
      id: "f-2",
      ruleId: "AUTH_PUBLIC_ADMIN",
      category: "auth",
      severity: "critical",
      title: "Public Admin API",
      message: "Admin action has no auth",
      plainEnglishExplanation: "Admin route",
      location: { filePath: "app/api/admin/route.ts", startLine: 1, endLine: 5 },
      fix: { description: "Add admin check", replacementCode: "" },
    },
  ];

  const verifications = new Map<string, VerificationResult>([
    ["f-1", { findingId: "f-1", verdict: "FALSE_POSITIVE", rationale: "Protected by middleware", confidence: 0.95 }],
    ["f-2", { findingId: "f-2", verdict: "CONFIRMED", rationale: "Excluded from middleware matcher, completely open", confidence: 0.98 }],
  ]);

  const synthesized = synthesizeFindings(findings, verifications);
  assert.equal(synthesized.length, 1);
  assert.equal(synthesized[0].id, "f-2");
  assert.match(synthesized[0].plainEnglishExplanation, /\[Verified by Wren Agent/);
});
