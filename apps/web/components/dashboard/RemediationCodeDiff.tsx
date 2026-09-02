"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

interface RemediationCodeDiffProps {
  vulnerableSnippet: string;
  suggestedFix: string;
}

export function RemediationCodeDiff({
  vulnerableSnippet,
  suggestedFix,
}: RemediationCodeDiffProps) {
  const [copied, setCopied] = React.useState(false);

  const copyFix = async () => {
    try {
      await navigator.clipboard.writeText(suggestedFix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy fix: ", err);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#09090b] font-mono text-xs overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-900 border-b border-zinc-800 text-zinc-400">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-300">
          Remediation Diff
        </span>
        <button
          type="button"
          onClick={copyFix}
          className="flex items-center gap-1.5 rounded px-2 py-0.5 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 text-[10px]">Copied Fix</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="text-[10px]">Copy Fix</span>
            </>
          )}
        </button>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Vulnerable Code (Red Diff) */}
        <div>
          <div className="text-[10px] text-red-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Vulnerable Code:
          </div>
          <pre className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/40 text-red-200 overflow-x-auto leading-relaxed">
            <code>{vulnerableSnippet}</code>
          </pre>
        </div>

        {/* Suggested Fix (Green Diff) */}
        <div>
          <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Recommended Fix:
          </div>
          <pre className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-900/40 text-emerald-200 overflow-x-auto leading-relaxed">
            <code>{suggestedFix}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
