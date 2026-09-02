"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CheckCircle2, Rocket, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CornerSparks, SparkColor } from "@/components/ui/card";
import { MOCK_PRICING_PLANS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function PricingSection() {
  const [billingCycle, setBillingCycle] = React.useState<"monthly" | "yearly">("monthly");

  const icons = {
    free: CheckCircle2,
    pro: Rocket,
    team: Users,
  };

  const planColors: Record<string, SparkColor> = {
    free: "cyan",
    pro: "gold",
    team: "indigo",
  };

  const comparisons: {
    title: string;
    description: string;
    sparkColor: SparkColor;
    glowClass: string;
  }[] = [
    {
      title: "Scans per month",
      description: "Free: 10 · Pro: Unlimited · Team: Unlimited",
      sparkColor: "emerald",
      glowClass: "sky-glow-emerald",
    },
    {
      title: "GitHub Action",
      description: "Free: — · Pro: Included · Team: Included",
      sparkColor: "purple",
      glowClass: "sky-glow-purple",
    },
    {
      title: "Support",
      description: "Free: Email · Pro: Priority · Team: Priority",
      sparkColor: "rose",
      glowClass: "sky-glow-rose",
    },
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-transparent">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 space-y-16">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
            Simple plans with concrete limits
          </h2>
          <p className="text-base sm:text-lg text-zinc-700 max-w-xl font-normal">
            Pick the plan that fits your team and scan volume. No surprises.
          </p>

          {/* Billing Toggle */}
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              className={cn(
                "text-sm font-medium transition-colors cursor-pointer",
                billingCycle === "monthly" ? "text-zinc-950 font-semibold" : "text-zinc-600 hover:text-zinc-900"
              )}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() =>
                setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")
              }
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-zinc-900 transition-colors focus:outline-none cursor-pointer"
              role="switch"
              aria-checked={billingCycle === "yearly"}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  billingCycle === "yearly" ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
            <button
              type="button"
              className={cn(
                "text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer",
                billingCycle === "yearly" ? "text-zinc-950 font-semibold" : "text-zinc-600 hover:text-zinc-900"
              )}
              onClick={() => setBillingCycle("yearly")}
            >
              <span>Yearly (save 17%)</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {MOCK_PRICING_PLANS.map((plan) => {
            const Icon = icons[plan.id as keyof typeof icons] || CheckCircle2;
            const sparkCol = planColors[plan.id] || "cyan";
            const displayPrice =
              billingCycle === "monthly" ? plan.priceMonthly : Math.round(plan.priceYearly / 12);

            return (
              <Card
                key={plan.id}
                sparkColor={sparkCol}
                className={cn(
                  "flex flex-col justify-between p-8 rounded-3xl border transition-all duration-200 backdrop-blur-md",
                  plan.highlight
                    ? "border-sky-300 shadow-2xl relative bg-zinc-950 text-white hover:border-sky-400"
                    : "border-sky-200/80 bg-white/80 text-zinc-950 hover:bg-white/95"
                )}
              >
                <div className="space-y-6">
                  {/* Top Icon & Title */}
                  <div className="space-y-4">
                    <div
                      className={cn(
                        "h-11 w-11 rounded-2xl flex items-center justify-center",
                        plan.highlight ? "bg-zinc-800 text-white" : "bg-sky-100 text-sky-950"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight">{plan.name}</h3>
                      <p
                        className={cn(
                          "text-sm mt-1",
                          plan.highlight ? "text-zinc-400" : "text-zinc-600"
                        )}
                      >
                        {plan.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="space-y-1 pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                        ${displayPrice}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          plan.highlight ? "text-zinc-400" : "text-zinc-600"
                        )}
                      >
                        /mo
                      </span>
                    </div>
                    {billingCycle === "yearly" && plan.priceYearly > 0 && (
                      <p
                        className={cn(
                          "text-xs",
                          plan.highlight ? "text-zinc-400" : "text-zinc-600"
                        )}
                      >
                        billed ${plan.priceYearly} yearly
                      </p>
                    )}
                  </div>

                  <div
                    className={cn(
                      "h-px w-full",
                      plan.highlight ? "bg-zinc-800" : "bg-sky-100"
                    )}
                  />

                  {/* Feature List */}
                  <div className="space-y-3">
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-3 text-sm">
                          <span
                            className={cn(
                              "h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                              plan.highlight
                                ? "bg-zinc-800 text-zinc-200"
                                : "bg-sky-100 text-sky-900"
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <span className={plan.highlight ? "text-zinc-200" : "text-zinc-700"}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="pt-8">
                  <Link href={plan.ctaHref} className="block w-full">
                    <Button
                      variant={plan.highlight ? "secondary" : "primary"}
                      className={cn(
                        "w-full rounded-xl h-11 font-medium",
                        plan.highlight ? "bg-white text-zinc-950 hover:bg-zinc-100" : ""
                      )}
                    >
                      {plan.ctaLabel}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Matrix */}
        <div className="pt-6 space-y-6">
          <div className="space-y-1.5 text-left">
            <h3 className="text-xl font-bold tracking-tight text-zinc-950">Compare plans</h3>
            <p className="text-zinc-600 text-sm">
              How the three plans compare, feature by feature.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {comparisons.map((item) => (
              <div
                key={item.title}
                className={`sky-glow-card ${item.glowClass} relative p-6 rounded-3xl border border-sky-200/80 bg-white/80 backdrop-blur-md space-y-2 hover:bg-white/95 transition-all shadow-xs`}
              >
                <CornerSparks color={item.sparkColor} />
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-sky-800" />
                  <h4 className="text-base font-semibold text-zinc-950">{item.title}</h4>
                </div>
                <p className="text-sm text-zinc-700 pl-6 leading-relaxed font-mono text-xs">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
