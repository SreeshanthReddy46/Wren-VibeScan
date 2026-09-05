import { useEffect, useState, useCallback, useRef } from "react";
import type { Finding, ScanLifecycleStatus, ScanStepEvent } from "@wren/shared-types";
import type { ScanRecord } from "../lib/scan-dispatcher.ts";
import { getSupabaseClient } from "../lib/supabase-client.ts";

export interface RealtimeState {
  status: ScanLifecycleStatus | string;
  stage?: string;
  findings: Finding[];
  events: ScanStepEvent[];
}

export interface RealtimeEventPayload {
  eventType: string;
  payload?: Record<string, unknown>;
  newFinding?: Finding;
  stage?: string;
  message?: string;
}

/**
 * Pure state transition reducer for realtime events.
 */
export function handleRealtimePayload(
  state: RealtimeState,
  event: RealtimeEventPayload
): RealtimeState {
  const next = { ...state };

  const findingToAdd: Finding | undefined =
    event.newFinding ||
    (event.payload?.finding as Finding | undefined);

  if (findingToAdd) {
    const existingIndex = next.findings.findIndex((f) => f.id === findingToAdd.id);
    if (existingIndex >= 0) {
      const updatedFindings = [...next.findings];
      updatedFindings[existingIndex] = { ...updatedFindings[existingIndex], ...findingToAdd };
      next.findings = updatedFindings;
    } else {
      next.findings = [...next.findings, findingToAdd];
    }
  }

  if (event.eventType === "scan.started") {
    next.status = "running";
    next.stage = event.stage || "discovering";
  } else if (event.eventType === "scan.progress") {
    next.status = "running";
    if (event.stage) next.stage = event.stage;
  } else if (event.eventType === "scan.completed") {
    next.status = "completed";
    next.stage = "completed";
  } else if (event.eventType === "scan.failed") {
    next.status = "failed";
    next.stage = "failed";
  }

  return next;
}

/**
 * React hook to stream live scan progress, findings, and events via Supabase Realtime
 * with automatic HTTP polling fallback for local/offline execution.
 */
export function useScanRealtime(scanId: string) {
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [events, setEvents] = useState<ScanStepEvent[]>([]);
  const [status, setStatus] = useState<ScanLifecycleStatus | string>("queued");
  const [stage, setStage] = useState<string>("queued");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const isPollingRef = useRef<boolean>(false);

  const fetchScanData = useCallback(async () => {
    if (!scanId) return;
    try {
      const res = await fetch(`/api/scans/${scanId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.scan) {
          setScan(data.scan);
          setStatus(data.scan.status);
          if (data.scan.progressStage) setStage(data.scan.progressStage);
        }
        if (data.findings) setFindings(data.findings);
        if (data.events) setEvents(data.events);
      }
    } catch (err) {
      console.warn(`Failed to fetch scan data for ${scanId}:`, err);
    }
  }, [scanId]);

  useEffect(() => {
    if (!scanId) return;

    let mounted = true;
    let channel: any = null;
    let pollInterval: NodeJS.Timeout | null = null;

    // 1. Initial data fetch
    void fetchScanData();

    // 2. Setup Realtime subscription or fallback polling
    async function setupSubscription() {
      const supabase: any = await getSupabaseClient();

      if (supabase) {
        channel = supabase
          .channel(`scan:${scanId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "scan_findings",
              filter: `scan_id=eq.${scanId}`,
            },
            (payload: any) => {
              if (!mounted) return;
              const newRow = payload.new;
              if (newRow) {
                const mappedFinding: Finding = {
                  id: newRow.id,
                  ruleId: newRow.rule_id,
                  category: newRow.category,
                  severity: newRow.severity,
                  title: newRow.title,
                  message: newRow.message,
                  plainEnglishExplanation: newRow.plain_english_explanation,
                  location: {
                    filePath: newRow.file_path,
                    startLine: newRow.start_line,
                    endLine: newRow.end_line,
                    snippet: newRow.snippet,
                  },
                  fix: newRow.suggested_fix || { description: "", replacementCode: "" },
                  isAiGeneratedPattern: newRow.is_verified,
                };
                setFindings((prev) => {
                  const state = handleRealtimePayload(
                    { status, stage, findings: prev, events: [] },
                    { eventType: "finding.discovered", newFinding: mappedFinding }
                  );
                  return state.findings;
                });
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "scans",
              filter: `id=eq.${scanId}`,
            },
            (payload: any) => {
              if (!mounted) return;
              const newRow = payload.new;
              if (newRow) {
                setStatus(newRow.status);
                if (newRow.progress_stage) setStage(newRow.progress_stage);
                setScan((prev) => (prev ? { ...prev, ...newRow } : newRow));
              }
            }
          )
          .subscribe((subStatus: string) => {
            if (mounted) {
              setIsConnected(subStatus === "SUBSCRIBED");
            }
          });
      } else {
        // Fallback polling for offline/local environment
        isPollingRef.current = true;
        pollInterval = setInterval(async () => {
          if (!mounted) return;
          await fetchScanData();
          if (status === "completed" || status === "failed") {
            if (pollInterval) clearInterval(pollInterval);
          }
        }, 1000);
      }
    }

    void setupSubscription();

    return () => {
      mounted = false;
      if (channel) {
        channel.unsubscribe();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [scanId, fetchScanData, status, stage]);

  return {
    scan,
    findings,
    events,
    status,
    stage,
    isConnected,
    refresh: fetchScanData,
  };
}
