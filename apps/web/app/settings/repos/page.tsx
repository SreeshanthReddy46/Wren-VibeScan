"use client";

import React, { useState } from "react";
import Link from "next/link";
import { RepoSettingsToggle } from "@/components/remediation/repo-settings-toggle";
import { Button } from "@/components/ui/button";
import {
  GitPullRequest,
  ShieldCheck,
  ArrowLeft,
  Lock,
  Sparkles,
  ExternalLink,
  Plus,
} from "lucide-react";

export default function RepoSettingsPage() {
  const [repositories, setRepositories] = useState<string[]>([
    "demo-user/sample-app",
    "SreeshanthReddy46/Wren-VibeScan",
  ]);
  const [newRepo, setNewRepo] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  function handleAddRepo(e: React.FormEvent) {
    e.preventDefault();
    if (!newRepo.trim() || !newRepo.includes("/")) return;
    if (!repositories.includes(newRepo.trim())) {
      setRepositories([...repositories, newRepo.trim()]);
    }
    setNewRepo("");
    setIsAdding(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-amber-500/30">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.12),rgba(255,255,255,0))] pointer-events-none" />

      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
            <GitPullRequest className="w-3.5 h-3.5" />
            GitHub App Autonomous Remediation
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Repository Remediation Settings
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
            Control which repositories allow Wren to autonomously open Pull Requests.
            Autonomous remediation is strictly opt-in and is never enabled by default.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
            <Lock className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="text-xs font-semibold text-white">Strict Opt-In</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              Gated per-repository. No code is ever written to repos without explicit opt-in.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
            <Sparkles className="w-5 h-5 text-cyan-400 mb-2" />
            <h4 className="text-xs font-semibold text-white">AST Verified</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              Patches are syntax-validated by TypeScript compiler before branch creation.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
            <ShieldCheck className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="text-xs font-semibold text-white">Zero Secret Leakage</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              Hardcoded secrets are converted to environment variables and sanitized.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">
              Configured Repositories ({repositories.length})
            </h2>
            <Button
              variant="outline"
              size="small"
              onClick={() => setIsAdding(!isAdding)}
              className="border-zinc-800 text-zinc-300 hover:text-white gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Repository
            </Button>
          </div>

          {isAdding && (
            <form
              onSubmit={handleAddRepo}
              className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-700/80 flex items-center gap-3 animate-in fade-in"
            >
              <input
                type="text"
                value={newRepo}
                onChange={(e) => setNewRepo(e.target.value)}
                placeholder="owner/repo (e.g. org/backend-api)"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <Button variant="primary" size="small" type="submit">
                Add
              </Button>
              <Button
                variant="ghost"
                size="small"
                type="button"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </Button>
            </form>
          )}

          {repositories.map((repo) => (
            <RepoSettingsToggle key={repo} repoName={repo} />
          ))}
        </div>
      </main>
    </div>
  );
}
