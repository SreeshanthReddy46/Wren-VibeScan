import * as React from "react";
import Link from "next/link";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Card, CornerSparks } from "@/components/ui/card";
import {
  ArrowRight,
  CheckCircle2,
  Zap,
  HelpCircle,
  AlertTriangle,
  FileCode,
} from "lucide-react";

export const metadata = {
  title: "Beginner Guide & Documentation — Wren",
  description: "Learn how to scan AI-built applications with Wren in simple, beginner-friendly terms.",
};

export default function DocsOverviewPage() {
  return (
    <div className="space-y-12">
      {/* Page Title & Intro */}
      <div className="space-y-4 pb-6 border-b border-sky-200/60">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
          Getting Started with Wren
        </h1>
        <p className="text-base sm:text-lg text-zinc-700 leading-relaxed">
          New to coding or building with AI tools like Cursor, Bolt, or Lovable? This guide explains how Wren protects your app before you publish it to the world.
        </p>
      </div>

      {/* Concept 1: What is Wren in Simple Words? */}
      <div className="sky-glow-card sky-glow-cyan p-6 sm:p-8 rounded-3xl border border-sky-200/80 bg-white/85 shadow-xs space-y-4 backdrop-blur-md">
        <CornerSparks color="cyan" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-900 flex items-center justify-center font-bold">
            💡
          </div>
          <h2 className="text-xl font-bold text-zinc-950">What is Wren in 10 Seconds?</h2>
        </div>
        <p className="text-sm sm:text-base text-zinc-700 leading-relaxed">
          Think of Wren like an <strong>automated safety spellchecker for your code</strong>. When AI writes your website, it focuses on making the design and buttons work quickly — but it often forgets to lock the front door. Wren looks through your project files and warns you if you accidentally left secret passwords or open database permissions behind.
        </p>
      </div>

      {/* Concept 2: Why AI tools make security mistakes */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
          Why Do AI-Built Apps Have Security Holes?
        </h2>
        <p className="text-sm text-zinc-600 leading-relaxed">
          When AI coding assistants write code, they follow the easiest path to make the preview load. Here are the 3 most common mistakes they make:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <Card sparkColor="rose" className="p-5 space-y-2 border-sky-200/80 bg-white/80">
            <span className="text-2xl">🔑</span>
            <h3 className="font-bold text-sm text-zinc-950">1. Pasting Secrets in Public Files</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              AI often embeds raw API keys (OpenAI, Stripe) directly into frontend files where any visitor can open developer tools and copy them.
            </p>
          </Card>

          <Card sparkColor="amber" className="p-5 space-y-2 border-sky-200/80 bg-white/80">
            <span className="text-2xl">🚪</span>
            <h3 className="font-bold text-sm text-zinc-950">2. Missing Login Checks</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Actions like &quot;Delete Project&quot; or &quot;Update User&quot; get created without checking if the person clicking the button actually owns that item.
            </p>
          </Card>

          <Card sparkColor="purple" className="p-5 space-y-2 border-sky-200/80 bg-white/80">
            <span className="text-2xl">📂</span>
            <h3 className="font-bold text-sm text-zinc-950">3. Wide-Open Database Rules</h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Database files often default to <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded font-mono">allow read, write: if true;</code>, allowing anyone on the internet to wipe your data.
            </p>
          </Card>
        </div>
      </div>

      {/* Step by step: How to run your first scan */}
      <div className="space-y-6 pt-4">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
          How to Run Your First Scan (3 Easy Steps)
        </h2>

        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-sky-200/80 bg-white/80 backdrop-blur-md space-y-3">
            <div className="flex items-center gap-2.5 font-bold text-zinc-950 text-sm">
              <span className="h-6 w-6 rounded-full bg-sky-900 text-white flex items-center justify-center text-xs">
                1
              </span>
              <span>Open the Terminal in your Project Folder</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              In VS Code or Cursor, press <kbd className="bg-zinc-100 border border-zinc-300 px-1.5 py-0.5 rounded text-[11px] font-mono">Ctrl + `</kbd> (or <kbd className="bg-zinc-100 border border-zinc-300 px-1.5 py-0.5 rounded text-[11px] font-mono">Cmd + `</kbd> on Mac) to open your command terminal.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-sky-200/80 bg-white/80 backdrop-blur-md space-y-3">
            <div className="flex items-center gap-2.5 font-bold text-zinc-950 text-sm">
              <span className="h-6 w-6 rounded-full bg-sky-900 text-white flex items-center justify-center text-xs">
                2
              </span>
              <span>Copy &amp; Paste this Command (No Install Required)</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Run this single command. It will inspect your project and output the safety report right on your screen:
            </p>
            <CodeBlock
              title="Terminal"
              code="npx wren-cli check ."
            />
          </div>

          <div className="p-5 rounded-2xl border border-sky-200/80 bg-white/80 backdrop-blur-md space-y-3">
            <div className="flex items-center gap-2.5 font-bold text-zinc-950 text-sm">
              <span className="h-6 w-6 rounded-full bg-sky-900 text-white flex items-center justify-center text-xs">
                3
              </span>
              <span>Review Findings and Apply the Suggested Fix</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Wren will show you the exact line of code that is unsafe, explain why in plain English, and give you a green replacement line you can copy and paste!
            </p>
          </div>
        </div>
      </div>

      {/* Visual Before & After Example */}
      <div className="space-y-4 pt-4">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-950">
          Example: Vulnerability vs. The Fix
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border border-red-200 bg-red-50/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-red-600 tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              <span>Unsafe Code (AI Generated)</span>
            </div>
            <pre className="p-3 rounded-xl bg-zinc-950 text-red-300 font-mono text-xs overflow-x-auto">
              <code>{`// ❌ Leaks your secret key to everyone!\nconst openai = new OpenAI({\n  apiKey: "sk-proj-98a28f82049..."\n});`}</code>
            </pre>
            <p className="text-xs text-red-950/80">
              The secret key is hardcoded directly in the file. Anyone inspecting your site can steal it and use your API quota.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-700 tracking-wider">
              <CheckCircle2 className="h-4 w-4" />
              <span>Safe Code (Wren Suggested Fix)</span>
            </div>
            <pre className="p-3 rounded-xl bg-zinc-950 text-emerald-300 font-mono text-xs overflow-x-auto">
              <code>{`// ✅ Kept safe in private environment variables\nconst openai = new OpenAI({\n  apiKey: process.env.OPENAI_API_KEY\n});`}</code>
            </pre>
            <p className="text-xs text-emerald-950/80">
              The key is loaded securely from the server environment, never exposed to visitors or committed to GitHub.
            </p>
          </div>
        </div>
      </div>

      {/* Next steps navigation cards */}
      <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/docs/installation" className="group">
          <Card sparkColor="cyan" className="p-5 space-y-2 border-sky-200/80 hover:border-sky-300 h-full">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-950 flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-sky-800" /> CLI Setup Guide
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-zinc-600">
              Commands, flags, and running scans locally.
            </p>
          </Card>
        </Link>

        <Link href="/docs/understanding-reports" className="group">
          <Card sparkColor="gold" className="p-5 space-y-2 border-sky-200/80 hover:border-sky-300 h-full">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-950 flex items-center gap-2 text-sm">
                <FileCode className="h-4 w-4 text-amber-700" /> Reading Reports
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-zinc-600">
              Understanding Critical, High, and Medium severity tiers.
            </p>
          </Card>
        </Link>

        <Link href="/docs/faq" className="group">
          <Card sparkColor="emerald" className="p-5 space-y-2 border-sky-200/80 hover:border-sky-300 h-full">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-950 flex items-center gap-2 text-sm">
                <HelpCircle className="h-4 w-4 text-emerald-700" /> Beginner FAQ
              </span>
              <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-zinc-600">
              Common questions answered in plain English.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
