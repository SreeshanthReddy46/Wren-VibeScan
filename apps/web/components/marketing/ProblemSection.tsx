import * as React from "react";
import { KeyRound, ShieldX, Database } from "lucide-react";
import { CornerSparks, SparkColor } from "@/components/ui/card";

export function ProblemSection() {
  const problems: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    sparkColor: SparkColor;
    glowClass: string;
  }[] = [
    {
      icon: KeyRound,
      title: "Exposed API keys",
      description:
        "AI tools often paste secrets directly into client-side code, frontend bundles, and config files where anyone can inspect them.",
      sparkColor: "rose",
      glowClass: "sky-glow-rose",
    },
    {
      icon: ShieldX,
      title: "Missing auth checks",
      description:
        "Routes and actions get generated without verifying who is calling them. Anyone with the URL can trigger sensitive business logic.",
      sparkColor: "amber",
      glowClass: "sky-glow-amber",
    },
    {
      icon: Database,
      title: "Unprotected database rules",
      description:
        "Firestore and Supabase rules default to open or overly permissive, letting anyone read or overwrite your entire database.",
      sparkColor: "purple",
      glowClass: "sky-glow-purple",
    },
  ];

  return (
    <section id="problem" className="py-20 sm:py-28 bg-transparent">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 max-w-2xl">
            AI moves fast. Security gets skipped.
          </h2>
          <p className="text-base sm:text-lg text-zinc-700 max-w-2xl font-normal">
            When you build with Cursor, Bolt, or Lovable, the code works — but it often ships with critical vulnerabilities that put your users and bills at risk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((problem) => {
            const Icon = problem.icon;
            return (
              <div
                key={problem.title}
                className={`sky-glow-card ${problem.glowClass} relative flex flex-col p-8 rounded-3xl border border-sky-200/80 bg-white/80 shadow-xs hover:bg-white/95 transition-all backdrop-blur-md`}
              >
                <CornerSparks color={problem.sparkColor} />
                <div className="h-12 w-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-6 shadow-sm">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-950 mb-3 tracking-tight">
                  {problem.title}
                </h3>
                <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                  {problem.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
