import * as React from "react";
import { Card } from "@/components/ui/card";
import { HelpCircle } from "lucide-react";

export const metadata = {
  title: "Beginner FAQ — Wren Docs",
  description: "Answers to common questions about vibe coding, security, and using Wren as a beginner.",
};

export default function FAQPage() {
  const faqs = [
    {
      q: "I am a beginner and not a cybersecurity expert. Can I still use Wren?",
      a: "Yes! Wren is specifically built for beginners and creators building with AI tools (Cursor, Bolt, Lovable, v0). Every issue is explained in plain English, and Wren provides copy-pasteable code fixes so you don't need any prior security knowledge.",
    },
    {
      q: "Will running a scan modify or break my code?",
      a: "No. Wren runs purely read-only static analysis. It inspects your project files and prints a report. It will never overwrite or change your files without your explicit action.",
    },
    {
      q: "Does Wren send my private source code to external servers?",
      a: "When running the local CLI (`npx wren scan .`), your code is evaluated locally on your computer and never uploaded or stored on any server. If you use the cloud dashboard, only high-level finding metadata (rule name, file path, line number) is synced.",
    },
    {
      q: "Why does AI code have security vulnerabilities in the first place?",
      a: "Large language models (like the ones powering Cursor, Bolt, or v0) are trained to generate functional UI components and fast working demos. They frequently take shortcuts—such as hardcoding mock secrets or omitting authentication checks—to get the app working on the first try.",
    },
    {
      q: "What frameworks and tools are supported?",
      a: "Wren has deep out-of-the-box rule support for Next.js (App Router & Pages Router), React, Vite, Supabase, Firebase Firestore, Prisma, and Stripe.",
    },
    {
      q: "Is the local CLI scanner free?",
      a: "Yes! You can run local scans on your computer with `npx wren scan .` completely free without creating an account.",
    },
  ];

  return (
    <div className="space-y-10">
      <div className="space-y-3 pb-6 border-b border-sky-200/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800">
          <HelpCircle className="h-4 w-4 text-sky-700" />
          <span>Frequently Asked Questions</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
          Beginner Questions Answered
        </h1>
        <p className="text-base sm:text-lg text-zinc-700 leading-relaxed">
          Everything you need to know about scanning vibe-coded apps, keeping secrets safe, and getting started with Wren.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const colors = ["cyan", "gold", "emerald", "purple", "rose", "indigo"] as const;
          const color = colors[idx % colors.length];

          return (
            <Card
              key={idx}
              sparkColor={color}
              className="p-6 sm:p-7 rounded-3xl border border-sky-200/80 bg-white/80 backdrop-blur-md shadow-xs space-y-2.5"
            >
              <h3 className="text-base sm:text-lg font-bold text-zinc-950">
                {faq.q}
              </h3>
              <p className="text-sm text-zinc-700 leading-relaxed">
                {faq.a}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
