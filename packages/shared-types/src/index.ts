/**
 * Wren Shared Types
 * Common domain models shared across CLI, Scan Engine (packages/core), and Next.js Web App.
 */

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Category =
  | "secret"
  | "auth"
  | "database"
  | "configuration"
  | "dependency";

export interface CodeLocation {
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
  snippet?: string;
}

export interface SuggestedFix {
  description: string;
  replacementCode: string;
  diff?: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  category: Category;
  severity: Severity;
  title: string;
  message: string;
  plainEnglishExplanation: string;
  location: CodeLocation;
  fix: SuggestedFix;
  cwe?: string;
  owaspCategory?: string;
  isAiGeneratedPattern?: boolean;
}

export interface ScanSummary {
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  filesScanned: number;
  scanDurationMs: number;
  completedAt: string;
}

export interface ScanResult {
  scanId: string;
  targetPath: string;
  timestamp: string;
  summary: ScanSummary;
  findings: Finding[];
  engineVersion: string;
  llmReasoningApplied?: boolean;
}

export type OutputFormat = "terminal" | "json" | "sarif";

export interface ScanConfig {
  targetPath?: string;
  ignorePaths?: string[];
  ignoreRules?: string[];
  failOnSeverity?: Severity;
  format?: OutputFormat;
  enableLlmReasoning?: boolean;
  apiKey?: string;
  apiUrl?: string;
  outputFile?: string;
}

export interface WrenUserConfig {
  apiKey?: string;
  apiUrl?: string;
  telemetryEnabled?: boolean;
  defaultFailSeverity?: Severity;
}

export interface HealthCheckResponse {
  status: "ok" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  services: {
    database: "connected" | "disconnected" | "mock";
    cache: "connected" | "disconnected" | "mock";
  };
}

export interface ApiScanRequest {
  targetRepoName?: string;
  branch?: string;
  commitHash?: string;
  findings: Finding[];
  summary: ScanSummary;
}

export interface ApiScanResponse {
  success: boolean;
  scanId: string;
  dashboardUrl?: string;
}

export type ScanLifecycleStatus =
  | "queued"
  | "discovering"
  | "static_analysis"
  | "agent_investigating"
  | "verifying"
  | "completed"
  | "failed";

export interface ScanJobRequest {
  scanId?: string;
  targetPath?: string;
  repoName?: string;
  branch?: string;
  commitHash?: string;
  config?: ScanConfig;
  externalReport?: ApiScanRequest;
}

export interface ScanJobResponse {
  success: boolean;
  scanId: string;
  status: ScanLifecycleStatus;
  dashboardUrl: string;
  message?: string;
}

export interface ScanStepEvent {
  id: string;
  scanId: string;
  eventType:
    | "scan.started"
    | "finding.discovered"
    | "finding.verified"
    | "scan.completed"
    | "scan.failed";
  stage?: string;
  stepIndex?: number;
  message?: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

