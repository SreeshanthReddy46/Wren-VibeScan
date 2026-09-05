import * as crypto from "crypto";

export interface CreatePrOptions {
  repoName: string;
  branchName: string;
  baseBranch?: string;
  filePath: string;
  patchedContent: string;
  title: string;
  body: string;
  installationId?: number;
}

export interface GitHubPrResult {
  success: boolean;
  isDryRun: boolean;
  prUrl?: string;
  prNumber?: number;
  branchName: string;
  error?: string;
}

export function isGitHubAppConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY
  );
}

/**
 * Generate GitHub App JWT token for app authentication.
 */
function generateAppJwt(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 600,
      iss: appId,
    })
  ).toString("base64url");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, "base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Creates a remediation branch, commits the verified patched code, and opens a GitHub Pull Request.
 * Features a safe, zero-dependency dry-run fallback for local development and test environments.
 */
export async function createRemediationPullRequest(
  options: CreatePrOptions
): Promise<GitHubPrResult> {
  const isConfigured = isGitHubAppConfigured();
  const isTestOrLocal =
    process.env.NODE_ENV === "test" || !isConfigured || process.env.WREN_DRY_RUN === "1";

  if (isTestOrLocal) {
    const mockPrNumber = Math.floor(Math.random() * 900) + 100;
    return {
      success: true,
      isDryRun: true,
      prUrl: `https://github.com/${options.repoName}/pull/${mockPrNumber}`,
      prNumber: mockPrNumber,
      branchName: options.branchName,
    };
  }

  const appId = process.env.GITHUB_APP_ID!;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const installationId =
    options.installationId || Number(process.env.GITHUB_APP_INSTALLATION_ID);

  if (!installationId) {
    return {
      success: false,
      isDryRun: false,
      branchName: options.branchName,
      error: "GitHub App Installation ID missing for repository",
    };
  }

  try {
    // 1. Get Installation Token
    const jwt = generateAppJwt(appId, privateKey);
    const tokenRes = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Wren-Security-Remediation",
        },
      }
    );

    if (!tokenRes.ok) {
      throw new Error(`Failed to obtain GitHub App installation token: ${tokenRes.statusText}`);
    }

    const tokenData = (await tokenRes.json()) as { token: string };
    const token = tokenData.token;
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Wren-Security-Remediation",
    };

    const baseBranch = options.baseBranch || "main";

    // 2. Get base branch commit SHA
    const refRes = await fetch(
      `https://api.github.com/repos/${options.repoName}/git/ref/heads/${baseBranch}`,
      { headers: authHeaders }
    );

    if (!refRes.ok) {
      throw new Error(`Failed to fetch base branch '${baseBranch}': ${refRes.statusText}`);
    }

    const refData = (await refRes.json()) as { object: { sha: string } };
    const baseSha = refData.object.sha;

    // 3. Create remediation branch
    await fetch(`https://api.github.com/repos/${options.repoName}/git/refs`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        ref: `refs/heads/${options.branchName}`,
        sha: baseSha,
      }),
    });

    // 4. Commit patched file
    // Check if file exists to obtain its blob sha
    let fileSha: string | undefined;
    const fileRes = await fetch(
      `https://api.github.com/repos/${options.repoName}/contents/${options.filePath}?ref=${options.branchName}`,
      { headers: authHeaders }
    );
    if (fileRes.ok) {
      const fileData = (await fileRes.json()) as { sha: string };
      fileSha = fileData.sha;
    }

    const contentBase64 = Buffer.from(options.patchedContent, "utf-8").toString("base64");
    const commitRes = await fetch(
      `https://api.github.com/repos/${options.repoName}/contents/${options.filePath}`,
      {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          message: options.title,
          content: contentBase64,
          branch: options.branchName,
          ...(fileSha ? { sha: fileSha } : {}),
        }),
      }
    );

    if (!commitRes.ok) {
      throw new Error(`Failed to commit patched file: ${commitRes.statusText}`);
    }

    // 5. Open Pull Request
    const prRes = await fetch(`https://api.github.com/repos/${options.repoName}/pulls`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        title: options.title,
        body: options.body,
        head: options.branchName,
        base: baseBranch,
      }),
    });

    if (!prRes.ok) {
      throw new Error(`Failed to open Pull Request: ${prRes.statusText}`);
    }

    const prData = (await prRes.json()) as { html_url: string; number: number };

    return {
      success: true,
      isDryRun: false,
      prUrl: prData.html_url,
      prNumber: prData.number,
      branchName: options.branchName,
    };
  } catch (err) {
    return {
      success: false,
      isDryRun: false,
      branchName: options.branchName,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
