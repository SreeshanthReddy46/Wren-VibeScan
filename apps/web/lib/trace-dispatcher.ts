import type { AgentTraceRecord, CriticRubric } from "@wren/shared-types";
import { isSupabaseConfigured, getSupabaseClient } from "./supabase-client.ts";

export interface AgentTraceStepRow {
  id?: string;
  scan_id?: string;
  step_number: number;
  tool_called: string | null;
  tool_input: string | null;
  tool_output: string | null;
  reasoning: string;
  created_at?: string;
}

const scanTracesStore = new Map<string, AgentTraceRecord[]>();
const deepTracesStore = new Map<string, AgentTraceStepRow[]>();

export async function recordAgentTrace(
  scanId: string,
  trace: AgentTraceRecord
): Promise<AgentTraceRecord> {
  const existing = scanTracesStore.get(scanId) || [];
  existing.push(trace);
  scanTracesStore.set(scanId, existing);

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
            scan_id: scanId,
            step_number: existing.length,
            tool_called: trace.step,
            tool_input:
              typeof trace.input === "string"
                ? trace.input
                : JSON.stringify(trace.input),
            tool_output:
              typeof trace.output === "string"
                ? trace.output
                : JSON.stringify(trace.output),
            reasoning: trace.reasoning,
            created_at: trace.timestamp || new Date().toISOString(),
          },
        ]);
      }
    } catch {}
  }

  return trace;
}

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
        const rows = traces.map((trace, idx) => ({
          scan_id: scanId,
          step_number: existing.length - traces.length + idx + 1,
          tool_called: trace.step,
          tool_input:
            typeof trace.input === "string"
              ? trace.input
              : JSON.stringify(trace.input),
          tool_output:
            typeof trace.output === "string"
              ? trace.output
              : JSON.stringify(trace.output),
          reasoning: trace.reasoning,
          created_at: trace.timestamp || new Date().toISOString(),
        }));
        await client.from("agent_traces").insert(rows);
      }
    } catch {}
  }

  return traces.length;
}

export async function recordDeepReasoningTrace(
  scanId: string,
  trace: AgentTraceStepRow
): Promise<AgentTraceStepRow> {
  const existing = deepTracesStore.get(scanId) || [];
  existing.push(trace);
  deepTracesStore.set(scanId, existing);

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
            scan_id: scanId,
            step_number: trace.step_number,
            tool_called: trace.tool_called,
            tool_input: trace.tool_input,
            tool_output: trace.tool_output,
            reasoning: trace.reasoning,
            created_at: trace.created_at || new Date().toISOString(),
          },
        ]);
      }
    } catch {}
  }

  return trace;
}

export async function recordDeepReasoningTraces(
  scanId: string,
  traces: AgentTraceStepRow[]
): Promise<number> {
  const existing = deepTracesStore.get(scanId) || [];
  existing.push(...traces);
  deepTracesStore.set(scanId, existing);

  if (isSupabaseConfigured && traces.length > 0) {
    try {
      const client = (await getSupabaseClient()) as {
        from: (table: string) => {
          insert: (records: unknown[]) => Promise<{ error: unknown }>;
        };
      } | null;

      if (client) {
        const rows = traces.map((t) => ({
          scan_id: scanId,
          step_number: t.step_number,
          tool_called: t.tool_called,
          tool_input: t.tool_input,
          tool_output: t.tool_output,
          reasoning: t.reasoning,
          created_at: t.created_at || new Date().toISOString(),
        }));
        await client.from("agent_traces").insert(rows);
      }
    } catch {}
  }

  return traces.length;
}

export async function getDeepReasoningTraces(
  scanId: string
): Promise<AgentTraceStepRow[]> {
  return deepTracesStore.get(scanId) || [];
}

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

export function clearTracesForTesting(): void {
  scanTracesStore.clear();
  deepTracesStore.clear();
}
