"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MOCK_SCANS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RemediationCodeDiff } from "@/components/dashboard/RemediationCodeDiff";
import {
  ArrowLeft,
  GitBranch,
  GitCommit,
  Clock,
  FileCode,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ScanReportDetailPage() {
  const params = useParams();
  const scanId = params.scanId as string;

  const scan = MOCK_SCANS.find((s) => s.id === scanId) || MOCK_SCANS[0];
  const [selectedSeverity, setSelectedSeverity] = React.useState<string>("all");

  const filteredFindings =
    selectedSeverity === "all"
      ? scan.findings
      : scan.findings.filter((f) => f.severity === selectedSeverity);

  return (
    <div className="space-y-8">
      {/* Back Navigation & Share */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Overview</span>
        </Link>

        <Button size="small" variant="outline" className="gap-1.5 rounded-xl text-xs">
          <Share2 className="h-3.5 w-3.5" />
          <span>Export SARIF / JSON</span>
        </Button>
      </div>

      {/* Header Info Card */}
      <div className="p-6 sm:p-8 rounded-3xl border border-sky-200/80 bg-white/80 backdrop-blur-md shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
                {scan.repo}
              </h1>
              <span className={cn(
                "text-xs font-semibold uppercase tracking-wider",
                scan.summary.critical > 0 ? "text-red-600" : "text-emerald-600"
              )}>
                {scan.summary.critical > 0
                  ? `${scan.summary.critical} Critical Findings`
                  : "Passing"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 font-mono">
              Scan ID: {scan.id} • {scan.commitMessage}
            </p>
          </div>

          {/* Quick Metrics Text */}
          <div className="flex items-center gap-4 text-xs">
            <span className="font-semibold text-red-600">{scan.summary.critical} Critical</span>
            <span className="text-zinc-400">·</span>
            <span className="font-semibold text-orange-600">{scan.summary.high} High</span>
            <span className="text-zinc-400">·</span>
            <span className="font-semibold text-amber-600">{scan.summary.medium} Medium</span>
          </div>
        </div>

        <div className="pt-4 border-t border-sky-200/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-zinc-700">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-sky-800" />
            <span>Branch: <strong>{scan.branch}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <GitCommit className="h-4 w-4 text-sky-800" />
            <span>Commit: <strong>{scan.commitHash}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-800" />
            <span>Duration: <strong>{scan.durationMs}ms</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-sky-800" />
            <span>Files Analyzed: <strong>{scan.summary.totalFiles}</strong></span>
          </div>
        </div>
      </div>

      {/* Findings Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-950">Detected Vulnerabilities</h2>
            <p className="text-xs text-zinc-600 mt-0.5">
              Review findings, risks, and recommended code modifications below.
            </p>
          </div>

          {/* Filter Options */}
          <div className="flex items-center gap-1.5 bg-sky-100/80 p-1 rounded-xl text-xs font-medium border border-sky-200/60">
            {["all", "critical", "high", "medium"].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedSeverity(tier)}
                className={cn(
                  "px-3 py-1 rounded-lg capitalize transition-all cursor-pointer",
                  selectedSeverity === tier
                    ? "bg-white text-zinc-950 font-bold shadow-xs"
                    : "text-zinc-600 hover:text-zinc-950"
                )}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Findings List */}
        <div className="space-y-6">
          {filteredFindings.map((finding) => {
            const severityColor =
              finding.severity === "critical"
                ? "text-red-600"
                : finding.severity === "high"
                ? "text-orange-600"
                : "text-amber-600";

            return (
              <Card
                key={finding.id}
                className="p-6 rounded-3xl border border-sky-200/80 bg-white/80 backdrop-blur-md shadow-xs space-y-5"
              >
                {/* Finding Title & File Marker */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs font-bold uppercase tracking-wider", severityColor)}>
                      {finding.severity}
                    </span>
                    <span className="text-xs font-medium text-zinc-400">·</span>
                    <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                      {finding.category}
                    </span>
                  </div>
                  <div className="font-mono text-xs font-semibold text-sky-950 bg-sky-100/70 border border-sky-200/60 px-2.5 py-1 rounded-lg self-start">
                    {finding.file}:{finding.line}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-zinc-950">{finding.title}</h3>
                  <p className="text-sm text-zinc-700 leading-relaxed bg-sky-50/70 p-3.5 rounded-2xl border border-sky-200/60">
                    <strong className="text-zinc-950 font-semibold">Security Risk: </strong>
                    {finding.explanation}
                  </p>
                </div>

                {/* Code Remediation Diff */}
                <RemediationCodeDiff
                  vulnerableSnippet={finding.snippet}
                  suggestedFix={finding.suggestedFix}
                />
              </Card>
            );
          })}

          {filteredFindings.length === 0 && (
            <div className="p-12 text-center rounded-3xl border border-sky-200/80 bg-white/80 backdrop-blur-md space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <div className="font-semibold text-zinc-950">No findings for this filter</div>
              <p className="text-xs text-zinc-600">All checks in this severity category passed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
