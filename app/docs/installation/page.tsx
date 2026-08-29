import * as React from "react";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { Card, CornerSparks } from "@/components/ui/card";
import { Terminal, CheckCircle2, Zap, HelpCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Installation & Commands Guide — Wren Docs",
  description: "Beginner guide on running Wren scans locally with npx or global npm.",
};

export default function InstallationPage() {
  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-sky-200/60">
        <div className="text-xs font-bold uppercase tracking-wider text-sky-800">
          Setup &amp; Commands
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
          How to Run Wren on Your Computer
        </h1>
        <p className="text-base sm:text-lg text-zinc-700 leading-relaxed">
          You don&apos;t need complex setup or paid accounts to run scans. Here is how to scan any project in seconds.
        </p>
      </div>

      {/* Option 1: On-Demand with npx (Recommended for Beginners) */}
      <div className="sky-glow-card sky-glow-cyan p-6 sm:p-8 rounded-3xl border border-sky-200/80 bg-white/85 shadow-xs space-y-4 backdrop-blur-md">
        <CornerSparks color="cyan" />
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-200">
            Recommended
          </span>
          <h2 className="text-xl font-bold text-zinc-950">Method 1: Instant Scan (No Install Needed)</h2>
        </div>
        <p className="text-sm text-zinc-700 leading-relaxed">
          If you have <strong>Node.js</strong> installed on your computer, you can run Wren immediately using <code className="bg-sky-50 text-sky-900 px-1 py-0.5 rounded font-mono text-xs">npx</code> without downloading any global software:
        </p>
        <CodeBlock code="npx wren scan ." title="Terminal" />
        <p className="text-xs text-zinc-500">
          💡 The dot (<code className="font-mono">.</code>) tells Wren to scan all files in your current folder.
        </p>
      </div>

      {/* Option 2: Global Installation */}
      <div className="p-6 sm:p-8 rounded-3xl border border-sky-200/80 bg-white/80 backdrop-blur-md space-y-4 shadow-xs">
        <h2 className="text-xl font-bold text-zinc-950">Method 2: Install Globally</h2>
        <p className="text-sm text-zinc-700 leading-relaxed">
          If you want to use the shorter <code className="bg-zinc-100 px-1.5 py-0.5 rounded font-mono text-xs">wren</code> command anywhere in your terminal:
        </p>
        <CodeBlock code="npm install -g wren" title="Terminal" />
        <p className="text-xs text-zinc-600">
          Once installed, you can simply type:
        </p>
        <CodeBlock code="wren scan" title="Terminal" />
      </div>

      {/* Beginner FAQ: Do I have Node.js? */}
      <div className="p-6 rounded-2xl border border-sky-200/70 bg-sky-50/60 space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-sky-950">
          <HelpCircle className="h-4 w-4 text-sky-800" />
          <span>Not sure if you have Node.js installed?</span>
        </div>
        <p className="text-xs text-zinc-700 leading-relaxed">
          Open your terminal and type <code className="bg-white px-1.5 py-0.5 rounded border border-sky-200 font-mono text-zinc-900 font-semibold">node -v</code>. If it prints a number like <code className="font-mono">v18.20.0</code> or <code className="font-mono">v20.10.0</code>, you are ready to go! If you get an error, download Node.js for free from <strong>nodejs.org</strong>.
        </p>
      </div>

      {/* Common Flags Explained in Plain English */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-zinc-950">Helpful Commands for Daily Use</h2>
        <div className="border border-sky-200/80 rounded-2xl overflow-hidden text-sm bg-white/80 backdrop-blur-md shadow-xs">
          <table className="w-full text-left">
            <thead className="bg-sky-50/80 border-b border-sky-200/80 text-xs font-bold text-sky-950 uppercase tracking-wider">
              <tr>
                <th className="p-4">Command</th>
                <th className="p-4">What It Does</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100 text-xs text-zinc-700">
              <tr>
                <td className="p-4 font-mono font-bold text-zinc-950">npx wren scan .</td>
                <td className="p-4 leading-relaxed">Scans the entire current folder and prints findings.</td>
              </tr>
              <tr>
                <td className="p-4 font-mono font-bold text-zinc-950">npx wren scan ./src</td>
                <td className="p-4 leading-relaxed">Scans only the <code className="font-mono text-zinc-800">src</code> subfolder.</td>
              </tr>
              <tr>
                <td className="p-4 font-mono font-bold text-zinc-950">--fail-on-critical</td>
                <td className="p-4 leading-relaxed">Stops build scripts if high-danger issues (like leaked keys) exist.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Next Step */}
      <div className="pt-4 flex items-center justify-between p-6 rounded-2xl border border-sky-200/80 bg-white/80 backdrop-blur-md">
        <div>
          <div className="font-bold text-zinc-950 text-sm">Ready to understand scan results?</div>
          <div className="text-xs text-zinc-600">Learn how to read and fix findings step-by-step.</div>
        </div>
        <Link href="/docs/understanding-reports" className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-900 hover:text-sky-950">
          <span>Understanding Reports</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
