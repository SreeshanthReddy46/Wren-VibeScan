"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import type { CustomerAgentEvent, RuntimeAlert } from "@wren/shared-types";
import {
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  BellRing,
  Code2,
  CheckCircle2,
  Terminal,
  RefreshCw,
  Search,
} from "lucide-react";

export default function RuntimeAuditDashboardPage() {
  const [events, setEvents] = useState<CustomerAgentEvent[]>([]);
  const [alerts, setAlerts] = useState<RuntimeAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CustomerAgentEvent | null>(null);
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
    <div className="min-h-screen flex flex-col bg-transparent selection:bg-sky-900 selection:text-white relative overflow-x-clip">
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <Link href="/settings/webhooks">
            <Button
              variant="outline"
              size="small"
              className="rounded-full bg-white/80 border-sky-200 text-zinc-700 hover:text-zinc-950 shadow-xs gap-1.5"
            >
              <BellRing className="w-3.5 h-3.5 text-sky-600" />
              Webhook Settings
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
              Live Agent Execution & Threat Audit
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 mt-2 max-w-2xl leading-relaxed">
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
            className="rounded-full bg-white/80 border-sky-200 text-zinc-700 hover:text-zinc-950 shadow-xs gap-2 self-start md:self-auto"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh Stream
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-5 rounded-2xl bg-white/80 border border-sky-200/70 backdrop-blur-md shadow-xs">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Total Ingested Actions
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-950 mt-1">
              {events.length}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white/80 border border-sky-200/70 backdrop-blur-md shadow-xs">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Active Security Alerts
            </p>
            <p
              className={`text-2xl sm:text-3xl font-bold mt-1 ${
                activeAlerts.length > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {activeAlerts.length}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white/80 border border-sky-200/70 backdrop-blur-md shadow-xs">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Critical Threat Rules
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-rose-600 mt-1">
              {criticalAlertsCount}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white/80 border border-sky-200/70 backdrop-blur-md shadow-xs">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Ingestion Ingest SLA
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-sky-600 mt-1">
              &lt; 10ms
            </p>
          </div>
        </div>

        {activeAlerts.length > 0 && (
          <div className="mb-10 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-rose-950 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse" />
                Active Security Threat Alerts ({activeAlerts.length})
              </h2>
              <span className="text-xs font-mono text-zinc-500">
                Webhook dispatched automatically via HMAC-SHA256
              </span>
            </div>

            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-5 rounded-2xl bg-rose-50/90 border border-rose-200/90 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-rose-800">
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-zinc-600">
                        {alert.ruleId}
                      </span>
                      <span className="text-xs text-zinc-700">
                        Agent:{" "}
                        <strong className="text-zinc-950 font-mono">
                          {alert.agentId}
                        </strong>
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                      className="rounded-full bg-white hover:bg-rose-100/60 border-rose-300 text-rose-800 text-xs font-semibold gap-1.5 self-start sm:self-auto"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Acknowledge Alert
                    </Button>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-rose-950">
                      {alert.ruleName}
                    </h3>
                    <p className="text-xs text-rose-800 mt-1">
                      {alert.description}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/95 border border-rose-200 font-mono text-xs text-rose-900 overflow-x-auto">
                    Evidence: {alert.evidence}
                  </div>

                  <div className="text-xs text-rose-900">
                    <span className="font-semibold text-rose-950">
                      Suggested Action:
                    </span>{" "}
                    {alert.suggestedAction}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-zinc-950 flex items-center gap-2.5">
              <Terminal className="w-5 h-5 text-sky-600" />
              Live Ingested Agent Action Stream ({filteredEvents.length})
            </h2>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter by agentId..."
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-full bg-white/90 border border-sky-200/80 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-mono shadow-xs w-56 sm:w-64"
                />
              </div>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white/80 border border-sky-200/70 backdrop-blur-md text-center shadow-xs">
              <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-zinc-950">
                No runtime actions logged yet
              </h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto">
                Send your first customer agent tool execution to{" "}
                <code className="text-sky-700 font-mono font-medium">
                  POST /api/v1/agent-events
                </code>{" "}
                to begin auditing live actions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white/85 border border-sky-200/70 hover:border-sky-300/90 shadow-xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-bold text-sky-950">
                        {evt.action}
                      </span>
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200/80 text-sky-900 font-medium">
                        {evt.agentId}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {evt.declaredIntent && (
                      <p className="text-xs text-zinc-600 truncate max-w-xl">
                        Declared Intent: &ldquo;{evt.declaredIntent}&rdquo;
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setSelectedEvent(evt)}
                    className="rounded-full bg-white/90 border-sky-200 text-zinc-800 hover:text-zinc-950 font-semibold text-xs gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
                  >
                    <Code2 className="w-3.5 h-3.5 text-sky-600" />
                    Inspect Payload
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      <Dialog
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        className="rounded-3xl bg-white text-zinc-950 border border-sky-200 shadow-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto"
      >
        <DialogClose
          onClose={() => setSelectedEvent(null)}
          className="hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
        />
        {selectedEvent && (
          <div className="space-y-4">
            <div>
              <span className="text-xs font-mono text-sky-700 font-semibold">
                Event ID: {selectedEvent.id}
              </span>
              <h2 className="text-xl font-bold text-zinc-950 mt-1 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-sky-600" />
                Action: {selectedEvent.action}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Agent:{" "}
                <span className="text-zinc-900 font-mono font-medium">
                  {selectedEvent.agentId}
                </span>{" "}
                • Environment:{" "}
                <span className="text-emerald-700 font-mono font-medium">
                  {selectedEvent.environment || "production"}
                </span>
              </p>
            </div>

            {selectedEvent.declaredIntent && (
              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/70 text-xs">
                <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px] block mb-1">
                  Declared Intent:
                </span>
                <p className="text-zinc-900 font-medium">&ldquo;{selectedEvent.declaredIntent}&rdquo;</p>
              </div>
            )}

            <div>
              <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px] block mb-1">
                Input Arguments Payload:
              </span>
              <pre className="p-4 rounded-2xl bg-zinc-950 font-mono text-xs text-emerald-400 overflow-x-auto border border-zinc-800 shadow-inner">
                {JSON.stringify(selectedEvent.arguments, null, 2)}
              </pre>
            </div>

            {selectedEvent.result && (
              <div>
                <span className="font-semibold text-zinc-500 uppercase tracking-wider text-[10px] block mb-1">
                  Execution Result:
                </span>
                <pre className="p-4 rounded-2xl bg-zinc-950 font-mono text-xs text-zinc-300 overflow-x-auto border border-zinc-800 shadow-inner">
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
