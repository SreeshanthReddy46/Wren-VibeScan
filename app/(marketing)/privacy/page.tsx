import * as React from "react";
import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Wren",
  description: "How Wren protects your personal data, API tokens, and source code privacy.",
};

export default function PrivacyPage() {
  return (
    <div className="pt-32 pb-24 sm:pt-40 sm:pb-32 bg-transparent">
      <div className="container max-w-3xl mx-auto px-4 sm:px-6 space-y-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-sky-900 hover:text-sky-950 font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-800">
            <Lock className="h-4 w-4" />
            <span>Data Protection</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-950">
            Privacy Policy
          </h1>
          <p className="text-sm text-zinc-600 font-mono">Last updated: August 29, 2026</p>
        </div>

        <div className="prose prose-zinc max-w-none space-y-8 text-zinc-700 leading-relaxed p-6 sm:p-8 rounded-3xl bg-white/80 border border-sky-200/80 backdrop-blur-md shadow-sm">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-950">1. Information We Collect</h2>
            <p>
              When you sign up for Wren, we collect your email address, authentication credentials (via OAuth providers such as GitHub), and billing information processed securely via Stripe. We do not store raw credit card numbers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-950">2. Source Code &amp; Scan Telemetry</h2>
            <p>
              Wren is designed with privacy at the core. When running CLI scans, analysis occurs locally on your machine or inside your GitHub Actions runner. Only high-level finding metadata (rule ID, severity score, file path, line numbers) is uploaded to your private dashboard if telemetry is enabled.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-950">3. No AI Model Training on User Code</h2>
            <p>
              We guarantee that your source code snippets, repository files, and scan findings are never utilized to fine-tune or train third-party or proprietary LLM models.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-950">4. Your Rights</h2>
            <p>
              You may request export or deletion of your account and scan history at any time by contacting our support team or visiting the Settings page in your dashboard.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
