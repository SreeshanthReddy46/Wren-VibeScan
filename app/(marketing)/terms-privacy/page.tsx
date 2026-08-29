import * as React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Legal & Privacy — Wren",
  description: "Terms of Service and Privacy Policy for the Wren vulnerability scanner platform.",
};

export default function TermsPrivacyHubPage() {
  return (
    <div className="pt-32 pb-24 sm:pt-40 sm:pb-32 bg-transparent">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
        <div className="space-y-4 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-800">
            Legal Center
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-950">
            Terms &amp; Privacy
          </h1>
          <p className="text-lg text-zinc-700 max-w-xl mx-auto font-normal">
            Everything you need to know about our security commitments, data handling, and service terms.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/terms" className="group block">
            <Card className="h-full p-8 rounded-2xl border border-sky-200/80 bg-white/80 backdrop-blur-md hover:border-sky-300 hover:shadow-md transition-all space-y-4">
              <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-950 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-950 group-hover:text-sky-900 transition-colors">
                Terms of Service
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Understand the rules, licensing, and liability policies governing your use of the Wren platform and CLI scanner.
              </p>
              <div className="pt-2 flex items-center gap-2 text-sm font-semibold text-sky-900">
                <span>Read Terms</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>

          <Link href="/privacy" className="group block">
            <Card className="h-full p-8 rounded-2xl border border-sky-200/80 bg-white/80 backdrop-blur-md hover:border-sky-300 hover:shadow-md transition-all space-y-4">
              <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-950 flex items-center justify-center">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-zinc-950 group-hover:text-sky-900 transition-colors">
                Privacy Policy
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Learn how we protect your source code privacy, zero-retention scanning architecture, and telemetry data.
              </p>
              <div className="pt-2 flex items-center gap-2 text-sm font-semibold text-sky-900">
                <span>Read Privacy Policy</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
