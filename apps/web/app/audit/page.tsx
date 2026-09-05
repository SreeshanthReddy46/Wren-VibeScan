"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import type { CustomerAgentEvent, RuntimeAlert } from "@wren/shared-types";
import {
  ShieldAlert,
  ShieldCheck,
  Radio,
  ArrowLeft,
  AlertTriangle,
  BellRing,
  Code2,
  Clock,
  ExternalLink,
  CheckCircle2,
  Activity,
  Terminal,
  FileCode,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

export default function RuntimeAuditDashboardPage() {
  const [events, setEvents] = useState<CustomerAgentEvent[]>([]);
  const [alerts, setAlerts] = useState<RuntimeAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CustomerAgentEvent | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<RuntimeAlert | null>(null);
  const [agentFilter, setAgentFilter] = useState("");

  async function fetchData() {
    try {
      const [eventsRes, alertsRes] = await Promise.all([
        fetch("/api/v1/agent-events"),
        fetch("/api/v1/runtime-alerts"),
      ]);

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        if (Array.isArray(eventsData.events)) {
          setEvents(eventsData.events);
        }
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        if (Array.isArray(alertsData.alerts)) {
          setAlerts(alertsData.alerts);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  async function handleAcknowledgeAlert(alertId: string) {
    try {
      const res = await fetch("/api/v1/runtime-alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, status: "acknowledged" }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alertId ? { ...a, status: "acknowledged" } : a
          )
        );
      }
    } catch {
      // Ignored
    }
  }

  const filteredEvents = agentFilter
    ? events.filter((e) =>
        e.agentId.toLowerCase().includes(agentFilter.toLowerCase())
      )
    : events;

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const criticalAlertsCount = activeAlerts.filter(
    (a) => a.severity === "critical"
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-amber-500/30">
      {/* Background radial glow */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.12),rgba(255,255,255,0))] pointer-events-none" />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Scanner
          </Link>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Runtime Stream Active
            </span>
            <Link
              href="/settings/webhooks"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800/80 text-zinc-300 hover:text-white border border-zinc-700/50 transition-colors"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
              Webhook Settings
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
              <Activity className="w-3.5 h-3.5" />
              Wren v2.0 Runtime Audit Engine
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Live Agent Execution & Threat Audit
            </h1>
            <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
              Real-time audit stream monitoring customer production agent tool
              calls against declared intent, detecting unsanctioned destructive
              actions and credential exfiltration.
            </p>
          </div>

          <Button
            variant="outline"
            size="small"
            onClick={() => {
              setRefreshing(true);
              fetchData();
            }}
            className="border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:text-white gap-2 self-start md:self-auto"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh Stream
          </Button>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <p className="text-xs text-zinc-400">Total Ingested Actions</p>
            <p className="text-2xl font-bold text-white mt-1">
              {events.length}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <p className="text-xs text-zinc-400">Active Security Alerts</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                activeAlerts.length > 0 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {activeAlerts.length}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <p className="text-xs text-zinc-400">Critical Threat Rules</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">
              {criticalAlertsCount}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <p className="text-xs text-zinc-400">Ingestion Ingest SLA</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">&lt; 10ms</p>
          </div>
        </div>

        {/* Active Security Threat Alerts Banner */}
        {activeAlerts.length > 0 && (
          <div className="mb-10 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                Active Security Threat Alerts ({activeAlerts.length})
              </h2>
              <span className="text-xs font-mono text-zinc-400">
                Webhook dispatched automatically via HMAC-SHA256
              </span>
            </div>

            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {alert.severity}
                      </span>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        {alert.ruleId}
                      </span>
                      <span className="text-xs text-zinc-300">
                        Agent:{" "}
                        <strong className="text-white font-mono">
                          {alert.agentId}
                        </strong>
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="border-rose-500/40 bg-rose-900/20 hover:bg-rose-900/40 text-rose-200 text-xs font-semibold gap-1.5 self-start sm:self-auto"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Acknowledge Alert
                    </Button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {alert.ruleName}
                    </h3>
                    <p className="text-xs text-zinc-300 mt-1">
                      {alert.description}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-rose-300 overflow-x-auto">
                    Evidence: {alert.evidence}
                  </div>

                  <div className="text-[11px] text-zinc-400">
                    <span className="font-semibold text-zinc-300">
                      Suggested Action:
                    </span>{" "}
                    {alert.suggestedAction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Ingested Agent Events Feed */}
        <div className="space-y-4 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-amber-400" />
              Live Ingested Agent Action Stream ({filteredEvents.length})
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter by agentId..."
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60 font-mono w-48"
                />
              </div>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">
                No runtime actions logged yet
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Send your first customer agent tool execution to{" "}
                <code className="text-amber-400 font-mono">
                  POST /api/v1/agent-events
                </code>{" "}
                to begin auditing live actions.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {evt.action}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                        {evt.agentId}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {evt.declaredIntent && (
                      <p className="text-xs text-zinc-400 truncate max-w-xl">
                        Declared Intent: &ldquo;{evt.declaredIntent}&rdquo;
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setSelectedEvent(evt)}
                    className="border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white font-semibold text-xs gap-1.5 self-start sm:self-auto shrink-0"
                  >
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    Inspect Payload
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Event Payload Inspector Modal */}
      <Dialog
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
      >
        <DialogClose onClose={() => setSelectedEvent(null)} />
        {selectedEvent && (
          <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div>
              <span className="text-xs font-mono text-amber-400 font-bold">
                Event ID: {selectedEvent.id}
              </span>
              <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                Action: {selectedEvent.action}
              </h2>
              <p className="text-xs text-zinc-400">
                Agent:{" "}
                <span className="text-white font-mono">
                  {selectedEvent.agentId}
                </span>{" "}
                • Environment:{" "}
                <span className="text-emerald-400 font-mono">
                  {selectedEvent.environment || "production"}
                </span>
              </p>
            </div>

            {selectedEvent.declaredIntent && (
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs">
                <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px] block mb-1">
                  Declared Intent:
                </span>
                <p className="text-white">&ldquo;{selectedEvent.declaredIntent}&rdquo;</p>
              </div>
            )}

            <div>
              <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px] block mb-1">
                Input Arguments Payload:
              </span>
              <pre className="p-3.5 rounded-xl bg-zinc-950 font-mono text-xs text-emerald-400 overflow-x-auto border border-zinc-800/80">
                {JSON.stringify(selectedEvent.arguments, null, 2)}
              </pre>
            </div>

            {selectedEvent.result && (
              <div>
                <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px] block mb-1">
                  Execution Result:
                </span>
                <pre className="p-3.5 rounded-xl bg-zinc-950 font-mono text-xs text-zinc-300 overflow-x-auto border border-zinc-800/80">
                  {JSON.stringify(selectedEvent.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
