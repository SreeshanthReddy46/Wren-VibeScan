"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MOCK_SCANS,
  MOCK_VULNERABILITY_TYPES,
  SCAN_METRICS,
} from "@/lib/mock-data";
import {
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Clock,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const latestScan = MOCK_SCANS[0];

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Security Overview
          </h1>
          <p className="text-sm text-zinc-600">
            Real-time vulnerability telemetry for your vibe-coded apps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/scans/${latestScan.id}`}>
            <Button size="small" className="gap-2 rounded-xl">
              <span>Inspect Latest Scan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-sky-200/80 bg-white/80 backdrop-blur-md p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Total Repositories</span>
            <ShieldCheck className="h-4 w-4 text-sky-700" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-zinc-950">
            {SCAN_METRICS.totalRepos}
          </div>
          <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>2 added this month</span>
          </div>
        </Card>

        <Card className="rounded-2xl border-sky-200/80 bg-white/80 backdrop-blur-md p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Scans Performed</span>
            <Clock className="h-4 w-4 text-sky-700" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-zinc-950">
            {SCAN_METRICS.scansRun}
          </div>
          <div className="text-xs text-zinc-500">Last scan 14m ago</div>
        </Card>

        <Card className="rounded-2xl border-sky-200/80 bg-white/80 backdrop-blur-md p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Active Vulnerabilities</span>
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-red-600">
            {SCAN_METRICS.activeVulnerabilities}
          </div>
          <div className="text-xs text-red-600 font-medium">
            1 High, 1 Med, 1 Low
          </div>
        </Card>

        <Card className="rounded-2xl border-sky-200/80 bg-white/80 backdrop-blur-md p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>Auto-Remediated</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-emerald-600">
            {SCAN_METRICS.remediatedIssues}
          </div>
          <div className="text-xs text-emerald-600 font-medium">85% fix rate</div>
        </Card>
      </div>

      {/* Main Scan History Table */}
      <Card className="rounded-2xl border-sky-200/80 bg-white/80 backdrop-blur-md overflow-hidden shadow-xs">
        <div className="p-6 border-b border-sky-200/60 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-950">
              Recent Scan Executions
            </h2>
            <p className="text-xs text-zinc-600">
              Automated CLI passes and GitHub Action CI/CD runs.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-sky-50/70 border-b border-sky-200/60 text-xs font-semibold uppercase text-zinc-600 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Repository / Branch</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Vulnerabilities</th>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/70">
              {MOCK_SCANS.map((scan) => (
                <tr
                  key={scan.id}
                  className="hover:bg-sky-50/40 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-zinc-950">{scan.repo}</div>
                    <div className="text-xs text-zinc-500 font-mono">{scan.branch} · {scan.commitHash}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-zinc-700 px-2.5 py-1 rounded-md bg-sky-100/70 border border-sky-200/60 capitalize">
                      {scan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {scan.summary.critical > 0 && (
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          {scan.summary.critical} Critical
                        </span>
                      )}
                      {scan.summary.high > 0 && (
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                          {scan.summary.high} High
                        </span>
                      )}
                      {scan.summary.medium > 0 && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {scan.summary.medium} Med
                        </span>
                      )}
                      {scan.summary.low > 0 && (
                        <span className="text-xs font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {scan.summary.low} Low
                        </span>
                      )}
                      {scan.summary.critical === 0 &&
                        scan.summary.high === 0 &&
                        scan.summary.medium === 0 &&
                        scan.summary.low === 0 && (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Clean
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500 font-mono">
                    {new Date(scan.scannedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/scans/${scan.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-900 hover:text-sky-950 transition-colors"
                    >
                      <span>View</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
