import * as React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service — Wren",
  description: "Terms of service and usage conditions for the Wren vulnerability scanner platform.",
};

export default function TermsPage() {
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
            <ShieldCheck className="h-4 w-4" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-950">
            Terms of Service
          </h1>
          <p className="text-sm text-zinc-600 font-mono">Last updated: August 29, 2026</p>
        </div>

        <div className="prose prose-zinc max-w-none space-y-8 text-zinc-700 leading-relaxed p-6 sm:p-8 rounded-3xl bg-white/80 border border-sky-200/80 backdrop-blur-md shadow-sm">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-950">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Wren service, CLI tools, GitHub Actions, or dashboard (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company or other legal entity, you represent that you have the authority to bind such entity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-950">2. Code Privacy &amp; Static Analysis</h2>
            <p>
              Wren is built on a zero-retention philosophy for your source code. Code parsed during static analysis via our CLI is evaluated in memory or within your local/CI environment. We do not store, index, or use your proprietary source code to train AI models.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-950">3. User Responsibilities</h2>
            <p>
              You agree not to use the Service to conduct unauthorized security testing or vulnerability scanning on codebases, systems, or third-party infrastructure for which you do not possess explicit permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-950">4. Disclaimer of Warranties</h2>
            <p>
              While Wren identifies common vulnerabilities and security antipatterns, no automated scanning tool can guarantee 100% detection of all potential security vulnerabilities. The Service is provided &quot;as is&quot; without warranties of any kind.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-zinc-950">5. Contact Information</h2>
            <p>
              For legal inquiries or security vulnerability disclosures, please contact us at{" "}
              <a href="mailto:security@wren.dev" className="text-sky-800 font-semibold underline">
                security@wren.dev
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
