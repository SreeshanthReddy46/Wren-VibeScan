import * as React from "react";
import { HeroSection } from "@/components/marketing/HeroSection";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { DemoSection } from "@/components/marketing/DemoSection";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { PricingSection } from "@/components/marketing/PricingSection";
import { WaitlistSection } from "@/components/marketing/WaitlistSection";

export const metadata = {
  title: "Wren — Catch vulnerabilities in vibe-coded apps",
  description:
    "Wren scans AI-built applications for exposed API keys, missing auth checks, and unprotected database rules before you deploy. Join the early access waitlist.",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <DemoSection />
      <HowItWorksSection />
      <PricingSection />
      <WaitlistSection />
    </>
  );
}
