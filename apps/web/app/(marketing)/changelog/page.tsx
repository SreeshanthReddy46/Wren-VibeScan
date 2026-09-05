import * as React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Changelog — Wren",
  description: "Recent updates, fixes, and improvements to the Wren static vulnerability analysis platform.",
};

export default function ChangelogPage() {
  const releases = [
    {
      version: "v0.4.0",
      date: "August 24, 2026",
      title: "Supabase & Convex Rule Analyzers, GitHub PR Bot",
      description: "Added dedicated AST parsers for Supabase RLS security policies and Convex database schemas. The Wren GitHub Action can now post inline PR annotations directly on offending lines.",
      features: [
        "Supabase RLS analyzer for unauthenticated write mutations",
        "Convex public query validation",
        "Inline GitHub Pull Request comment bot",
        "Export reports to SARIF for GitHub Security tab integration",
      ],
    },
    {
      version: "v0.3.2",
      date: "August 10, 2026",
      title: "Hardcoded AI Key Detectors (Anthropic, Gemini, Groq)",
      description: "Expanded secret scanning signatures to catch raw API keys from emerging AI providers before client-side bundle compilation.",
      features: [
        "Signatures for Anthropic (sk-ant-api03-*), Google Gemini, and Groq keys",
        "Detection for Next.js public env var prefix leaks (NEXT_PUBLIC_*)",
        "Improved false positive filtering for test fixture files",
      ],
    },
    {
      version: "v0.3.0",
      date: "July 28, 2026",
      title: "Initial Public Beta Launch",
      description: "First public release of the Wren CLI and dashboard platform.",
      features: [
        "Core static analysis engine for Next.js 14/15 App Router",
        "Firestore rule vulnerability detector",
        "Interactive web dashboard with line-by-line remediation diffs",
        "Waitlist and team management system",
      ],
    },
  ];

  return (
    <div className="pt-32 pb-24 sm:pt-40 sm:pb-32 bg-transparent">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-16">

        <div className="space-y-4 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-800">
            <Sparkles className="h-4 w-4" />
            <span>Product Updates</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-950">
            Changelog
          </h1>
          <p className="text-lg text-zinc-700 max-w-2xl font-normal">
            Follow the latest engine improvements, rule updates, and security linters added to Wren.
          </p>
        </div>

        <div className="relative border-l border-sky-200/80 ml-4 sm:ml-6 pl-6 sm:pl-10 space-y-12">
          {releases.map((release) => (
            <div key={release.version} className="relative group">

              <div className="absolute -left-[31px] sm:-left-[47px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-sky-400 bg-white group-hover:scale-125 transition-transform" />

              <div className="p-8 rounded-2xl border border-sky-200/80 bg-white/80 backdrop-blur-md hover:border-sky-300 transition-all shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-bold text-zinc-950">
                      {release.version}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100/90 text-sky-900 border border-sky-200/60">
                      Release
                    </span>
                  </div>
                  <time className="text-xs text-zinc-500 font-mono">{release.date}</time>
                </div>

                <h2 className="text-xl font-bold tracking-tight text-zinc-950">
                  {release.title}
                </h2>

                <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                  {release.description}
                </p>

                <div className="pt-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-sky-800 mb-2">
                    Key Highlights
                  </div>
                  <ul className="space-y-2">
                    {release.features.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-zinc-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 rounded-3xl bg-white/80 border border-sky-200/80 text-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md backdrop-blur-md">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl font-bold tracking-tight">Want to suggest a security rule?</h3>
            <p className="text-sm text-zinc-600">
              We add new static patterns weekly based on community feedback.
            </p>
          </div>
          <Link href="/#waitlist">
            <Button size="default" className="gap-2 shrink-0">
              <span>Join waitlist</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
