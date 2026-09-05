import type { Finding, Severity, SuggestedFix } from "@wren/shared-types";
import type { VerdictStatus, VerificationResult } from "../agent/types";

export interface MemoryEntry {
  id?: string;
  projectId?: string;
  isGlobal: boolean;
  ruleId: string;
  category: string;
  codeHash: string;
  codeSnippet: string;
  verdict: VerdictStatus;
  confidence: number;
  rationale: string;
  suggestedFix?: SuggestedFix;
  adjustedSeverity?: Severity;
  embedding?: number[];
  hitCount?: number;
  createdAt?: string;
}

export type MemoryHitType =
  | "EXACT_HASH"
  | "VECTOR_HIGH_CONFIDENCE"
  | "VECTOR_CONTEXT"
  | "MISS";

export interface MemoryMatch {
  entry: MemoryEntry;
  similarity: number;
  hitType: MemoryHitType;
}

export interface MemoryLookupResult {
  hit: boolean;
  hitType: MemoryHitType;
  match?: MemoryMatch;
}

export interface MemoryStoreConfig {
  projectId?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  openaiApiKey?: string;
  highConfidenceThreshold?: number;
  mediumConfidenceThreshold?: number;
  timeoutMs?: number;
}

export const DEFAULT_MEMORY_CONFIG = {
  highConfidenceThreshold: 0.92,
  mediumConfidenceThreshold: 0.80,
  timeoutMs: 2500,
};

export interface MemoryStore {
  lookup(finding: Finding, projectId?: string): Promise<MemoryLookupResult>;
  save(
    finding: Finding,
    verification: VerificationResult,
    projectId?: string,
    isGlobal?: boolean
  ): Promise<void>;
}
