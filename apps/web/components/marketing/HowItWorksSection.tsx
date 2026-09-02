import * as React from "react";
import { Search, BrainCircuit, FileText } from "lucide-react";
import { CornerSparks, SparkColor } from "@/components/ui/card";

export function HowItWorksSection() {
  const steps: {
    icon: React.ComponentType<{ className?: string }>;
    stepNumber: string;
    title: string;
    description: string;
    sparkColor: SparkColor;
    glowClass: string;
  }[] = [
    {
      icon: Search,
      stepNumber: "01",
      title: "Scan",
      description:
        "Wren walks your codebase and builds a map of where secrets, auth, and data rules live.",
      sparkColor: "cyan",
      glowClass: "sky-glow-cyan",
    },
    {
      icon: BrainCircuit,
      stepNumber: "02",
      title: "Reason",
      description:
        "An AI-assisted pass checks each finding against how the code actually behaves, filtering out false positives.",
      sparkColor: "gold",
      glowClass: "sky-glow-gold",
    },
    {
      icon: FileText,
      stepNumber: "03",
      title: "Report",
      description:
        "You get a prioritized list of issues with the exact file and line to fix, plus a plain-language explanation of the risk.",
      sparkColor: "emerald",
      glowClass: "sky-glow-emerald",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-transparent">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 max-w-2xl">
            Scan, reason, report
          </h2>
          <p className="text-base sm:text-lg text-zinc-700 max-w-2xl font-normal">
            Three steps, no magic. Here&apos;s what happens between pointing Wren at your repo and reading the report.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className={`sky-glow-card ${step.glowClass} relative flex flex-col items-center text-center p-8 rounded-3xl border border-sky-200/80 bg-white/80 shadow-xs hover:bg-white/95 transition-all backdrop-blur-md`}
              >
                <CornerSparks color={step.sparkColor} />
                <div className="h-12 w-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center mb-6 shadow-sm">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-zinc-950 mb-3 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-sm sm:text-base text-zinc-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
