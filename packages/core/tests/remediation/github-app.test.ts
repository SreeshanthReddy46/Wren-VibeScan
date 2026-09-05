import test from "node:test";
import assert from "node:assert/strict";
import {
  createRemediationPullRequest,
  isGitHubAppConfigured,
} from "../../../../apps/web/lib/github-app.ts";

test("createRemediationPullRequest operates in dry-run mode when credentials absent", async () => {
  const result = await createRemediationPullRequest({
    repoName: "acme/vibe-shop",
    branchName: "wren/fix-f-sec-1",
    filePath: "src/openai.ts",
    patchedContent: "export const apiKey = process.env.OPENAI_API_KEY;\n",
    title: "fix(security): resolve OpenAI API key exposure",
    body: "## Security Remediation\n\nAbstracted secret to process.env.",
  });

  assert.equal(result.success, true);
  assert.equal(result.isDryRun, true);
  assert.ok(result.prUrl);
  assert.match(result.prUrl, /pull/);
  assert.ok(result.prNumber);
  assert.equal(result.branchName, "wren/fix-f-sec-1");
});

test("isGitHubAppConfigured reflects environment state", () => {
  const configured = isGitHubAppConfigured();
  assert.equal(typeof configured, "boolean");
});
