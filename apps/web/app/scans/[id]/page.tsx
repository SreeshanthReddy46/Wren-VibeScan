"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useScanRealtime } from "@/hooks/use-scan-realtime";
import { RemediationModal } from "@/components/remediation/remediation-modal";
import { Button } from "@/components/ui/button";
import type { Finding } from "@wren/shared-types";
import {
  ShieldAlert,
  ShieldCheck,
  GitPullRequest,
  Terminal,
  Activity,
  ArrowLeft,
  Clock,
  Code2,
  FileCode,
  Sparkles,
  AlertTriangle,
  Radio,
} from "lucide-react";

export default function ScanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const scanId = resolvedParams.id;

  const { scan, findings, events, status, stage, isConnected } =
    useScanRealtime(scanId);

  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;

  function handleFixWithPr(finding: Finding) {
    setSelectedFinding(finding);
    setModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-amber-500/30">
      {/* Background radial gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.12),rgba(255,255,255,0))] pointer-events-none" />

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Navigation & Status Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                status === "completed"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : status === "running"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse"
                  : "bg-zinc-800/60 text-zinc-300 border-zinc-700/50"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              {status} {stage ? `(${stage})` : ""}
            </span>

            {isConnected && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Realtime
              </span>
            )}
          </div>
        </div>

        {/* Scan Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
            <span>Scan ID:</span>
            <span className="text-amber-400 font-bold">{scanId}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Live Scan & Remediation Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
            Automated deep security analysis with cross-scan memory and autonomous GitHub App pull request remediation.
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <p className="text-xs text-zinc-400">Total Findings</p>
            <p className="text-2xl font-bold text-white mt-1">
              {findings.length}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <p className="text-xs text-zinc-400">Critical Issues</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">
              {criticalCount}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <p className="text-xs text-zinc-400">High Issues</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {highCount}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
            <p className="text-xs text-zinc-400">Medium Issues</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">
              {mediumCount}
            </p>
          </div>
        </div>

        {/* Findings Section */}
        <div className="space-y-4 mb-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              Identified Vulnerabilities ({findings.length})
            </h2>
            <Link
              href="/settings/repos"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline"
            >
              Configure Autonomous PR Settings →
            </Link>
          </div>

          {findings.length === 0 ? (
            <div className="p-12 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 text-center">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">
                No vulnerabilities detected
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                No hardcoded credentials, insecure auth handlers, or unprotected database rules were discovered in this scan.
              </p>
            </div>
          ) : (
            findings.map((finding) => (
              <div
                key={finding.id}
                className="p-5 sm:p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/90 hover:border-zinc-700 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        finding.severity === "critical"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : finding.severity === "high"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">
                      {finding.ruleId}
                    </span>
                    {finding.cwe && (
                      <span className="text-[11px] font-mono text-zinc-500">
                        {finding.cwe}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleFixWithPr(finding)}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold gap-1.5 self-start sm:self-auto"
                  >
                    <GitPullRequest className="w-3.5 h-3.5" />
                    Fix with PR
                  </Button>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">
                    {finding.title}
                  </h3>
                  <p className="text-xs text-zinc-300 mt-1">
                    {finding.plainEnglishExplanation}
                  </p>
                </div>

                {/* Location & Code Snippet */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 font-mono text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] mb-2">
                    <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                    {finding.location.filePath}:{finding.location.startLine}
                  </div>
                  {finding.location.snippet && (
                    <pre className="text-rose-400/90 overflow-x-auto whitespace-pre-wrap">
                      {finding.location.snippet}
                    </pre>
                  )}
                </div>

                {/* Suggested Fix Hint */}
                {finding.fix && (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs">
                    <span className="font-semibold text-emerald-300 flex items-center gap-1 mb-1">
                      <Sparkles className="w-3.5 h-3.5" /> Autonomous Fix Proposal:
                    </span>
                    <p className="text-zinc-300">{finding.fix.description}</p>
                    {finding.fix.replacementCode && (
                      <code className="block mt-1.5 p-2 rounded-lg bg-zinc-950 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                        {finding.fix.replacementCode}
                      </code>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Live Event Stream / Audit Log */}
        {events && events.length > 0 && (
          <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/80">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              Live Pipeline Event Log
            </h3>
            <div className="space-y-2 font-mono text-xs max-h-48 overflow-y-auto">
              {events.map((evt, idx) => (
                <div key={idx} className="flex items-start gap-2 text-zinc-400">
                  <span className="text-zinc-500">[{new Date(evt.timestamp).toLocaleTimeString()}]</span>
                  <span className="text-amber-400 font-semibold">{evt.stage || evt.eventType}:</span>
                  <span className="text-zinc-300">{evt.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Interactive Autonomous Remediation Modal */}
      <RemediationModal
        finding={selectedFinding}
        scanId={scanId}
        repoName={scan?.repoName || "demo-user/sample-app"}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
