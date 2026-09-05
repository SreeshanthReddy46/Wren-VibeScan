"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, ShieldAlert, GitPullRequest, Check, Loader2 } from "lucide-react";
import type { Severity } from "@wren/shared-types";

interface RepoSettingsToggleProps {
  repoName: string;
}

export function RepoSettingsToggle({ repoName }: RepoSettingsToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [minSeverity, setMinSeverity] = useState<Severity>("critical");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [owner, repo] = repoName.split("/");
        if (!owner || !repo) return;
        const res = await fetch(`/api/repos/${owner}/${repo}/settings`);
        if (res.ok) {
          const data = await res.json();
          setEnabled(Boolean(data.autoRemediateEnabled));
          if (data.minSeverity) setMinSeverity(data.minSeverity);
        }
      } catch (err) {
        console.warn("Failed to load repo settings:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadSettings();
  }, [repoName]);

  async function handleToggle(newValue: boolean) {
    setSaving(true);
    setSavedSuccess(false);
    setEnabled(newValue);

    try {
      const [owner, repo] = repoName.split("/");
      const res = await fetch(`/api/repos/${owner}/${repo}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoRemediateEnabled: newValue,
          minSeverity,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update repo settings:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSeverityChange(newSeverity: Severity) {
    setMinSeverity(newSeverity);
    setSaving(true);
    setSavedSuccess(false);

    try {
      const [owner, repo] = repoName.split("/");
      const res = await fetch(`/api/repos/${owner}/${repo}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoRemediateEnabled: enabled,
          minSeverity: newSeverity,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update repo severity:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-zinc-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        Loading repository remediation settings...
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-white space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">
              Autonomous Pull Requests
            </h3>
            {savedSuccess && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
            {saving && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Authorize Wren's GitHub App to autonomously propose AST-verified
            remediation Pull Requests for security findings on{" "}
            <span className="font-mono text-zinc-300 font-semibold">{repoName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-center">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            {enabled ? "Opted In" : "Disabled (Default)"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-zinc-800/80 text-xs">
        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-zinc-200">Strict Opt-In Guard</p>
            <p className="text-zinc-400 mt-0.5">
              Autonomous remediation is never enabled by default. Only designated repository admins can authorize code changes.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-start gap-2.5">
          <GitPullRequest className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-zinc-200">Minimum Severity Gate</p>
            <div className="flex items-center gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => handleSeverityChange("critical")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  minSeverity === "critical"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-zinc-800/60 text-zinc-400 hover:text-white"
                }`}
              >
                Critical Only
              </button>
              <button
                type="button"
                onClick={() => handleSeverityChange("high")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  minSeverity === "high"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-zinc-800/60 text-zinc-400 hover:text-white"
                }`}
              >
                High & Critical
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
