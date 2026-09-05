import type { Finding, ScanConfig, ScanSummary, ApiScanRequest } from "@wren/shared-types";

export type ScanRequestedData = {
  scanId: string;
  targetPath?: string;
  repoName?: string;
  branch?: string;
  commitHash?: string;
  config?: ScanConfig;
  externalReport?: ApiScanRequest;
};

export type ScanProgressData = {
  scanId: string;
  stage: string;
  message: string;
  stepIndex?: number;
  payload?: Record<string, unknown>;
};

export type FindingDiscoveredData = {
  scanId: string;
  finding: Finding;
};

export type FindingVerifiedData = {
  scanId: string;
  finding: Finding;
  isVerified: boolean;
  rationale?: string;
};

export type ScanCompletedData = {
  scanId: string;
  summary: ScanSummary;
  durationMs: number;
  findingsCount: number;
};

export type ScanFailedData = {
  scanId: string;
  error: string;
};

export type RemediationRequestedData = {
  remediationId: string;
  scanId: string;
  findingId: string;
  repoName: string;
  targetPath?: string;
};

export type RemediationCompletedData = {
  remediationId: string;
  prUrl: string;
  prNumber: number;
  branchName: string;
};

export type RemediationFailedData = {
  remediationId: string;
  error: string;
};

export type Events = {
  "scan.requested": { data: ScanRequestedData };
  "scan.progress": { data: ScanProgressData };
  "finding.discovered": { data: FindingDiscoveredData };
  "finding.verified": { data: FindingVerifiedData };
  "scan.completed": { data: ScanCompletedData };
  "scan.failed": { data: ScanFailedData };
  "remediation.requested": { data: RemediationRequestedData };
  "remediation.completed": { data: RemediationCompletedData };
  "remediation.failed": { data: RemediationFailedData };
};

