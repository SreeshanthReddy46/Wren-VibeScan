import * as React from "react";
import { PricingSection } from "@/components/marketing/PricingSection";

export const metadata = {
  title: "Pricing — Wren",
  description: "Simple pricing for Wren: Free local CLI, Pro with unlimited scans and GitHub Action integration, and Team with shared seats.",
};

export default function PricingPage() {
  return (
    <div className="pt-16">
      <PricingSection />
    </div>
  );
}
