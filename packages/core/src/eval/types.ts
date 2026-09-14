import type { Category } from "@wren/shared-types";

export interface GroundTruthSnippet {
  id: string;
  name: string;
  category: Category;
  expectedRuleId?: string;
  expectedVulnerable: boolean;
  code: string;
  fileName: string;
  mitigationNotes?: string;
}

export interface EvalMetrics {
  total: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  falsePositiveRate: number;
}

export interface EvalSnippetResult {
  snippet: GroundTruthSnippet;
  findingsCount: number;
  isCorrect: boolean;
  classification: "TP" | "FP" | "TN" | "FN";
  detectedRuleIds: string[];
}

export interface EvalResult {
  overall: EvalMetrics;
  byCategory: Record<string, EvalMetrics>;
  results: EvalSnippetResult[];
  timestamp: string;
  engineVersion: string;
}

export interface EvalRunnerOptions {
  enableLlm?: boolean;
  apiKey?: string;
  confidenceThreshold?: number;
  snippets?: GroundTruthSnippet[];
}
