import * as React from "react";
import { Card, CornerSparks } from "@/components/ui/card";
import { AlertOctagon, AlertTriangle, Info, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Understanding Scan Reports — Wren Docs",
  description: "Beginner guide on understanding severity levels, risks, and applying code fixes.",
};

export default function UnderstandingReportsPage() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-sky-200/60">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
          How to Read Your Scan Report
        </h1>
        <p className="text-base sm:text-lg text-zinc-700 leading-relaxed">
          When Wren finishes scanning, it produces a clear report. Here is what every part of the report means and how to fix findings.
        </p>
      </div>

      {/* Severity Tiers in Plain English */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-zinc-950">What Do the Severity Levels Mean?</h2>
        
        <div className="space-y-4">
          {/* Critical */}
          <div className="sky-glow-card sky-glow-rose p-6 rounded-3xl border border-red-200 bg-red-50/70 space-y-2 backdrop-blur-md shadow-xs">
            <CornerSparks color="rose" />
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="h-5 w-5 text-red-600 shrink-0" />
              <span className="font-bold text-base text-red-950">
                Critical — Fix Before Deploying
              </span>
            </div>
            <p className="text-xs sm:text-sm text-red-900/90 leading-relaxed">
              <strong>What it means:</strong> Direct danger of financial loss or data loss. For example: an OpenAI secret key or Stripe live token is written directly into frontend JavaScript, or database write permissions are completely public.
            </p>
          </div>

          {/* High */}
          <div className="sky-glow-card sky-glow-amber p-6 rounded-3xl border border-orange-200 bg-orange-50/70 space-y-2 backdrop-blur-md shadow-xs">
            <CornerSparks color="amber" />
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
              <span className="font-bold text-base text-orange-950">
                High — Unprotected Actions &amp; Missing Logins
              </span>
            </div>
            <p className="text-xs sm:text-sm text-orange-900/90 leading-relaxed">
              <strong>What it means:</strong> A button or API endpoint performs a sensitive action (like deleting user accounts or charging cards) without verifying if the caller is logged in and authorized.
            </p>
          </div>

          {/* Medium */}
          <div className="sky-glow-card sky-glow-purple p-6 rounded-3xl border border-amber-200 bg-amber-50/70 space-y-2 backdrop-blur-md shadow-xs">
            <CornerSparks color="purple" />
            <div className="flex items-center gap-2.5">
              <Info className="h-5 w-5 text-amber-700 shrink-0" />
              <span className="font-bold text-base text-amber-950">
                Medium — Weak Configuration
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-900/90 leading-relaxed">
              <strong>What it means:</strong> Row Level Security (RLS) is turned off on database tables, or CORS headers are too permissive. Someone could read public rows without restriction.
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown of a Finding Card */}
      <div className="space-y-4 pt-4">
        <h2 className="text-2xl font-bold text-zinc-950">Anatomy of a Finding (How to Fix It)</h2>
        <p className="text-sm text-zinc-600">
          Every issue flagged by Wren contains 4 key pieces of information:
        </p>

        <div className="p-6 sm:p-8 rounded-3xl border border-sky-200/80 bg-white/90 shadow-sm space-y-5 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-sky-950">
              1. File &amp; Line: src/app/api/summarize/route.ts:14
            </span>
            <span className="text-xs font-bold text-red-600">
              Critical Finding
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-950">
              2. Title: Hardcoded OpenAI Secret Key Exposed in Client Bundle
            </h3>
            <p className="text-xs text-zinc-700 leading-relaxed bg-sky-50/60 p-3 rounded-xl border border-sky-100">
              <strong>3. Plain English Explanation:</strong> API keys committed in client-accessible files will leak to the browser network tab. Anyone who views your site can steal your key.
            </p>
          </div>

          {/* Fix Diff */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-zinc-950">4. Suggested Code Replacement:</div>
            <div className="rounded-xl overflow-hidden font-mono text-xs border border-zinc-800 bg-zinc-950 text-zinc-300">
              <div className="p-3 bg-red-950/40 text-red-300 border-b border-zinc-800">
                - const openai = new OpenAI(&#123; apiKey: &quot;sk-proj-839201948204820...&quot; &#125;);
              </div>
              <div className="p-3 bg-emerald-950/40 text-emerald-300">
                + const openai = new OpenAI(&#123; apiKey: process.env.OPENAI_API_KEY &#125;);
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Step */}
      <div className="pt-4 flex items-center justify-between p-6 rounded-2xl border border-sky-200/80 bg-white/80 backdrop-blur-md">
        <div>
          <div className="font-bold text-zinc-950 text-sm">Automate scans on GitHub?</div>
          <div className="text-xs text-zinc-600">Scan every Pull Request automatically with our GitHub Action.</div>
        </div>
        <Link href="/docs/github-action" className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-900 hover:text-sky-950">
          <span>GitHub Action Setup</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
