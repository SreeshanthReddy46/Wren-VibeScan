import type { AgentTraceRecord, CriticRubric } from "@wren/shared-types";
import { isSupabaseConfigured, getSupabaseClient } from "./supabase-client.ts";

// In-memory trace store keyed by scanId
const scanTracesStore = new Map<string, AgentTraceRecord[]>();

/**
 * Record a single agent trace record into storage
 */
export async function recordAgentTrace(
  scanId: string,
  trace: AgentTraceRecord
): Promise<AgentTraceRecord> {
  const existing = scanTracesStore.get(scanId) || [];
  existing.push(trace);
  scanTracesStore.set(scanId, existing);

  // If Supabase is configured and client available in environment, write to agent_traces table
  if (isSupabaseConfigured) {
    try {
      const client = (await getSupabaseClient()) as {
        from: (table: string) => {
          insert: (records: unknown[]) => Promise<{ error: unknown }>;
        };
      } | null;

      if (client) {
        await client.from("agent_traces").insert([
          {
            id: trace.id,
            scan_id: scanId,
            finding_id: trace.findingId,
            step: trace.step,
            input: typeof trace.input === "string" ? trace.input : JSON.stringify(trace.input),
            output: typeof trace.output === "string" ? trace.output : JSON.stringify(trace.output),
            reasoning: trace.reasoning,
            confidence_score: trace.confidenceScore,
            rubric: trace.rubric,
            duration_ms: trace.durationMs,
            timestamp: trace.timestamp,
          },
        ]);
      }
    } catch {
      // In-memory fallback is always preserved
    }
  }

  return trace;
}

/**
 * Record a batch of agent trace records into storage
 */
export async function recordAgentTraceBatch(
  scanId: string,
  traces: AgentTraceRecord[]
): Promise<number> {
  const existing = scanTracesStore.get(scanId) || [];
  existing.push(...traces);
  scanTracesStore.set(scanId, existing);

  if (isSupabaseConfigured && traces.length > 0) {
    try {
      const client = (await getSupabaseClient()) as {
        from: (table: string) => {
          insert: (records: unknown[]) => Promise<{ error: unknown }>;
        };
      } | null;

      if (client) {
        const rows = traces.map((trace) => ({
          id: trace.id,
          scan_id: scanId,
          finding_id: trace.findingId,
          step: trace.step,
          input: typeof trace.input === "string" ? trace.input : JSON.stringify(trace.input),
          output: typeof trace.output === "string" ? trace.output : JSON.stringify(trace.output),
          reasoning: trace.reasoning,
          confidence_score: trace.confidenceScore,
          rubric: trace.rubric,
          duration_ms: trace.durationMs,
          timestamp: trace.timestamp,
        }));
        await client.from("agent_traces").insert(rows);
      }
    } catch {
      // Fallback intact
    }
  }

  return traces.length;
}

/**
 * Retrieve all traces for a scan, with optional filtering by findingId
 */
export async function getAgentTracesByScanId(
  scanId: string,
  findingId?: string
): Promise<AgentTraceRecord[]> {
  const traces = scanTracesStore.get(scanId) || [];
  if (!findingId) {
    return traces;
  }
  return traces.filter((t) => t.findingId === findingId);
}

/**
 * Aggregates Critic evaluations across all recorded traces for a scan
 */
export function summarizeCriticRubrics(traces: AgentTraceRecord[]): {
  criticCount: number;
  averageEvidenceQuality: number;
  averageFalsePositiveRisk: number;
  averageConfidence: number;
} {
  const criticTraces = traces.filter((t) => t.step === "critic" && t.rubric);
  if (criticTraces.length === 0) {
    return {
      criticCount: 0,
      averageEvidenceQuality: 0,
      averageFalsePositiveRisk: 0,
      averageConfidence: 0,
    };
  }

  const totals = criticTraces.reduce(
    (acc, t) => {
      const r = t.rubric!;
      acc.eq += r.evidenceQuality ?? 0;
      acc.fpr += r.falsePositiveRisk ?? 0;
      acc.conf += r.confidenceScore ?? 0;
      return acc;
    },
    { eq: 0, fpr: 0, conf: 0 }
  );

  const n = criticTraces.length;
  return {
    criticCount: n,
    averageEvidenceQuality: Number((totals.eq / n).toFixed(2)),
    averageFalsePositiveRisk: Number((totals.fpr / n).toFixed(2)),
    averageConfidence: Number((totals.conf / n).toFixed(2)),
  };
}

/**
 * Clear in-memory traces (used for unit testing isolation)
 */
export function clearTracesForTesting(): void {
  scanTracesStore.clear();
}
