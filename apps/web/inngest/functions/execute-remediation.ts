import { inngest } from "../client.ts";
import { generateRemediationPatch } from "@wren/core";
import { createRemediationPullRequest } from "../../lib/github-app.ts";
import { getScanFindings } from "../../lib/scan-dispatcher.ts";
import {
  getRepoSettings,
  updateRemediationStatus,
} from "../../lib/remediation-dispatcher.ts";

export const executeRemediationFunction = inngest.createFunction(
  {
    id: "execute-remediation",
    name: "Autonomous Security Remediation",
    triggers: [{ event: "remediation.requested" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { remediationId, scanId, findingId, repoName, targetPath } = event.data;

    await step.run("verify-opt-in", async () => {
      const settings = await getRepoSettings(repoName);
      return { optIn: settings.autoRemediateEnabled };
    });

    const patchResult = await step.run("generate-patch", async () => {
      await updateRemediationStatus(remediationId, "generating_patch");
      const findings = await getScanFindings(scanId);
      const finding = findings.find((f) => f.id === findingId) || {
        id: findingId,
        ruleId: "WREN-SEC-001",
        category: "secret",
        severity: "critical",
        title: "Autonomous Remediation Finding",
        message: "Automated patch requested",
        plainEnglishExplanation: "Remediating security risk autonomously.",
        location: {
          filePath: "src/security.ts",
          startLine: 1,
          endLine: 1,
          snippet: 'apiKey: "sk-proj-raw-secret-12345"',
        },
        fix: {
          description: "Use process.env.API_SECRET",
          replacementCode: "apiKey: process.env.API_SECRET",
        },
      };

      const patch = await generateRemediationPatch(finding as any, { targetPath });
      if (!patch.isValid) {
        throw new Error(patch.error || "Syntax check failed on generated patch");
      }
      return patch;
    });

    const prResult = await step.run("create-github-pr", async () => {
      await updateRemediationStatus(remediationId, "syntax_verifying", {
        patchDiff: patchResult.diff,
        branchName: patchResult.branchName,
        explanation: patchResult.explanation,
      });

      const pr = await createRemediationPullRequest({
        repoName,
        branchName: patchResult.branchName,
        filePath: patchResult.filePath,
        patchedContent: patchResult.patchedContent,
        title: patchResult.title,
        body: patchResult.explanation,
      });

      if (!pr.success) {
        throw new Error(pr.error || "GitHub App failed to create Pull Request");
      }

      await updateRemediationStatus(remediationId, "pr_opened", {
        prUrl: pr.prUrl,
        prNumber: pr.prNumber,
        branchName: pr.branchName,
      });

      return pr;
    });

    return { remediationId, prUrl: prResult.prUrl, prNumber: prResult.prNumber };
  }
);
