import type { Finding, Severity, SuggestedFix } from "@wren/shared-types";

export interface AgentProgressEvent {
  stage: "planner" | "investigator" | "verifier" | "reporter";
  findingId?: string;
  message: string;
}

export interface AgentScanConfig {
  targetPath: string;
  projectId?: string;
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  maxToolTurns?: number;
  timeoutMs?: number;
  memoryStore?: any;
  onProgress?: (event: AgentProgressEvent) => void;
}

export const DEFAULT_AGENT_CONFIG: Required<Omit<AgentScanConfig, "apiKey" | "apiUrl" | "onProgress" | "memoryStore" | "projectId">> = {
  targetPath: ".",
  model: "claude-3-5-sonnet-latest",
  maxToolTurns: 4,
  timeoutMs: 25000,
};

export interface ToolCallRequest {
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolCallResult {
  toolName: string;
  success: boolean;
  content: string;
  error?: string;
}

export interface CodebaseToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface CodebaseTools {
  definitions: CodebaseToolDefinition[];
  execute(request: ToolCallRequest): Promise<ToolCallResult>;
}

export interface PlannerResult {
  investigationQueue: Finding[];
  directFindings: Finding[];
}

export interface InvestigationStep {
  turn: number;
  thought?: string;
  toolCall?: ToolCallRequest;
  toolResult?: ToolCallResult;
}

export interface InvestigationResult {
  findingId: string;
  steps: InvestigationStep[];
  gatheredContext: string[];
  completed: boolean;
  error?: string;
}

export type VerdictStatus = "CONFIRMED" | "FALSE_POSITIVE" | "SEVERITY_ADJUSTED";

export interface VerificationResult {
  findingId: string;
  verdict: VerdictStatus;
  rationale: string;
  confidence: number;
  adjustedSeverity?: Severity;
  suggestedFix?: SuggestedFix;
}
