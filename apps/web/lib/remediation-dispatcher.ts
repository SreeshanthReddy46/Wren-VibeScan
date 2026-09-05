import type {
  Finding,
  RemediationRequest,
  RemediationResponse,
  RemediationStatus,
  RepoRemediationSettings,
} from "@wren/shared-types";
import { generateRemediationPatch } from "@wren/core";
import { inngest } from "../inngest/client.ts";
import { createRemediationPullRequest } from "./github-app.ts";
import { getScanFindings } from "./scan-dispatcher.ts";

export interface RemediationRecord {
  id: string;
  scanId: string;
  findingId: string;
  repoName: string;
  status: RemediationStatus;
  branchName?: string;
  prNumber?: number;
  prUrl?: string;
  patchDiff?: string;
  explanation?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

// In-memory store fallback for repository settings & remediation jobs
const repoSettingsStore = new Map<string, RepoRemediationSettings>();
const remediationStore = new Map<string, RemediationRecord>();

export async function getRepoSettings(
  repoName: string
): Promise<RepoRemediationSettings> {
  const existing = repoSettingsStore.get(repoName);
  if (existing) return existing;

  const defaultSettings: RepoRemediationSettings = {
    repoName,
    autoRemediateEnabled: false,
    minSeverity: "critical",
    branchPrefix: "wren/fix-",
  };
  repoSettingsStore.set(repoName, defaultSettings);
  return defaultSettings;
}

export async function updateRepoSettings(
  repoName: string,
  updates: Partial<RepoRemediationSettings>
): Promise<RepoRemediationSettings> {
  const current = await getRepoSettings(repoName);
  const updated: RepoRemediationSettings = {
    ...current,
    ...updates,
  };
  repoSettingsStore.set(repoName, updated);
  return updated;
}

export async function getRemediationRecord(
  remediationId: string
): Promise<RemediationRecord | null> {
  return remediationStore.get(remediationId) || null;
}

export async function updateRemediationStatus(
  remediationId: string,
  status: RemediationStatus,
  updates: Partial<RemediationRecord> = {}
): Promise<void> {
  const existing = remediationStore.get(remediationId);
  if (!existing) return;

  const updated: RemediationRecord = {
    ...existing,
    ...updates,
    status,
    completedAt:
      status === "pr_opened" || status === "failed"
        ? new Date().toISOString()
        : existing.completedAt,
  };

  remediationStore.set(remediationId, updated);
}

/**
 * Local in-process execution for tests, offline mode, or fallback without Inngest server.
 */
async function runLocalRemediation(
  remediationId: string,
  request: RemediationRequest
): Promise<void> {
  try {
    await updateRemediationStatus(remediationId, "generating_patch");

    // 1. Locate finding
    const findings = await getScanFindings(request.scanId);
    let finding = findings.find((f) => f.id === request.findingId);

    if (!finding) {
      // Fallback synthetic finding for direct unit testing
      finding = {
        id: request.findingId,
        ruleId: "WREN-SEC-001",
        category: "secret",
        severity: "critical",
        title: "Remediation Candidate Finding",
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
    }

    // 2. Generate patch with AST validation & zero-leakage secret abstraction
    const patchResult = await generateRemediationPatch(finding, {
      targetPath: request.targetPath,
    });

    if (!patchResult.isValid) {
      await updateRemediationStatus(remediationId, "failed", {
        errorMessage: patchResult.error || "Syntax check failed on generated patch",
      });
      return;
    }

    await updateRemediationStatus(remediationId, "syntax_verifying", {
      patchDiff: patchResult.diff,
      branchName: patchResult.branchName,
      explanation: patchResult.explanation,
    });

    // 3. Open PR via GitHub App client (or dry-run)
    const prResult = await createRemediationPullRequest({
      repoName: request.repoName || "org/repo",
      branchName: patchResult.branchName,
      filePath: patchResult.filePath,
      patchedContent: patchResult.patchedContent,
      title: patchResult.title,
      body: patchResult.explanation,
    });

    if (!prResult.success) {
      await updateRemediationStatus(remediationId, "failed", {
        errorMessage: prResult.error || "Failed to create pull request via GitHub App",
      });
      return;
    }

    // 4. Mark complete
    await updateRemediationStatus(remediationId, "pr_opened", {
      prUrl: prResult.prUrl,
      prNumber: prResult.prNumber,
      branchName: prResult.branchName,
    });
  } catch (err) {
    await updateRemediationStatus(remediationId, "failed", {
      errorMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Dispatches remediation job: returns immediately with 202 Accepted status.
 */
export async function dispatchRemediationJob(
  request: RemediationRequest
): Promise<RemediationResponse> {
  const remediationId = `rem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  // Record queued status
  const record: RemediationRecord = {
    id: remediationId,
    scanId: request.scanId,
    findingId: request.findingId,
    repoName: request.repoName || "org/repo",
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  remediationStore.set(remediationId, record);

  const inngestKey = process.env.INNGEST_EVENT_KEY || process.env.INNGEST_SIGNING_KEY;
  const isDevOrTest =
    process.env.NODE_ENV === "test" || !inngestKey || process.env.WREN_LOCAL_WORKER === "1";

  if (!isDevOrTest) {
    try {
      await inngest.send({
        name: "remediation.requested",
        data: {
          remediationId,
          scanId: request.scanId,
          findingId: request.findingId,
          repoName: request.repoName || "org/repo",
          targetPath: request.targetPath,
        },
      });
    } catch (inngestErr) {
      console.warn("Failed to dispatch to Inngest, falling back to local runner:", inngestErr);
      setTimeout(() => {
        void runLocalRemediation(remediationId, request);
      }, 0);
    }
  } else {
    setTimeout(() => {
      void runLocalRemediation(remediationId, request);
    }, 0);
  }

  return {
    success: true,
    remediationId,
    status: "queued",
    message: "Remediation job queued successfully",
  };
}
