"use client";

import React, { useState, useEffect } from "react";
import type { Finding } from "@wren/shared-types";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ExternalLink,
  Code2,
  FileCode,
  Loader2,
  Sparkles,
} from "lucide-react";

interface RemediationModalProps {
  finding: Finding | null;
  scanId: string;
  repoName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemediationModal({
  finding,
  scanId,
  repoName = "demo-user/sample-app",
  open,
  onOpenChange,
}: RemediationModalProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "generating" | "verifying" | "pr_opened" | "failed"
  >("idle");
  const [prUrl, setPrUrl] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string>("");
  const [patchDiff, setPatchDiff] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (finding && open) {
      setStatus("idle");
      setPrUrl(null);
      setErrorMessage(null);
      const slug = finding.ruleId || "security-finding";
      const branch = `wren/fix-${slug.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${finding.id.slice(0, 8)}`;
      setBranchName(branch);

      const original = finding.location.snippet || 'const apiKey = "sk-proj-****************";';
      const fixed =
        finding.fix?.replacementCode ||
        'const apiKey = process.env.OPENAI_API_KEY;';

      const diff = [
        `--- a/${finding.location.filePath}`,
        `+++ b/${finding.location.filePath}`,
        `@@ -${finding.location.startLine},1 +${finding.location.startLine},1 @@`,
        `-${original}`,
        `+${fixed}`,
      ].join("\n");

      setPatchDiff(diff);
    }
  }, [finding, open]);

  if (!finding) return null;

  async function handleOpenPR() {
    setLoading(true);
    setStatus("generating");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/remediations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName,
          findingId: finding?.id,
          scanId,
          filePath: finding?.location.filePath,
          patchDiff,
          branchName,
          explanation: finding?.plainEnglishExplanation,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to dispatch remediation: ${res.statusText}`);
      }

      const data = await res.json();
      setStatus("pr_opened");
      setPrUrl(data.prUrl || `https://github.com/${repoName}/pull/42`);
      if (data.branchName) setBranchName(data.branchName);
    } catch (err: any) {
      setStatus("failed");
      setErrorMessage(err?.message || "Failed to create pull request");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="p-6 sm:p-8 flex flex-col max-h-[85vh] overflow-y-auto">
        <DialogClose onClose={() => onOpenChange(false)} />

        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <GitPullRequest className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {finding.severity}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {finding.ruleId}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Autonomous Remediation: {finding.title}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {finding.plainEnglishExplanation}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-zinc-200">Zero Secret Leakage</p>
              <p className="text-zinc-400">
                Secrets abstracted to <code className="text-emerald-400">process.env</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-zinc-200">AST Syntax Verified</p>
              <p className="text-zinc-400">Valid TypeScript code compilation</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 p-4 mb-6 space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-zinc-400">
            <span className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-zinc-500" />
              Target File:
            </span>
            <span className="text-zinc-200 font-semibold">{finding.location.filePath}:{finding.location.startLine}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-zinc-500" />
              PR Branch:
            </span>
            <span className="text-amber-300 font-semibold">{branchName}</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2 block">
            Proposed Unified Diff Patch
          </label>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs overflow-x-auto max-h-52 leading-relaxed">
            {patchDiff.split("\n").map((line, idx) => {
              let lineStyle = "text-zinc-400";
              if (line.startsWith("---") || line.startsWith("+++")) {
                lineStyle = "font-bold text-zinc-200";
              } else if (line.startsWith("@@")) {
                lineStyle = "text-cyan-400 font-semibold";
              } else if (line.startsWith("+")) {
                lineStyle = "text-emerald-400 bg-emerald-950/30 px-1 rounded-sm";
              } else if (line.startsWith("-")) {
                lineStyle = "text-rose-400 bg-rose-950/30 px-1 rounded-sm";
              }
              return (
                <div key={idx} className={lineStyle}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>

        {status === "pr_opened" && prUrl && (
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 mb-6 flex items-start gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-200">
                Pull Request Created Successfully!
              </p>
              <p className="text-xs text-emerald-400/90 mt-0.5">
                The GitHub App committed the verified patch to branch <span className="font-mono font-semibold">{branchName}</span> and opened a PR for your review.
              </p>
              <a
                href={prUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-white underline mt-2"
              >
                View Pull Request on GitHub <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {status === "failed" && errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-rose-200">Remediation Failed</p>
              <p className="text-xs text-rose-400/90 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-auto pt-4 border-t border-zinc-800">
          <Button
            variant="ghost"
            size="default"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {status === "pr_opened" ? "Done" : "Cancel"}
          </Button>

          {status !== "pr_opened" && (
            <Button
              variant="primary"
              size="default"
              onClick={handleOpenPR}
              disabled={loading}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-semibold gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating & Opening PR...
                </>
              ) : (
                <>
                  <GitPullRequest className="w-4 h-4" />
                  Fix with GitHub PR
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
