"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ScrollImageEffect } from "@/components/marketing/ScrollImageEffect";
import { CornerSparks } from "@/components/ui/card";

function RevealWords({
  text,
  baseDelay = 150,
  stagger = 55,
}: {
  text: string;
  baseDelay?: number;
  stagger?: number;
}) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, idx) => {
        const delay = baseDelay + idx * stagger;
        return (
          <span key={idx} className="word-reveal-wrapper">
            <span
              className="word-reveal-text"
              style={{ animationDelay: `${delay}ms` }}
            >
              {word}
            </span>
            <span
              className="word-reveal-curtain"
              style={{ animationDelay: `${delay}ms` }}
            />
          </span>
        );
      })}
    </>
  );
}

export function HeroSection() {
  const headlineText =
    "Catch exposed keys, missing auth, and unsafe database rules before you deploy.";

  const subtitleText =
    "Wren statically scans your codebase and flags the vulnerabilities AI coding tools tend to leave behind — before they reach production.";

  return (
    <section id="hero" className="relative pt-36 pb-24 sm:pt-48 sm:pb-36 overflow-hidden">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Main Headline with Light Yellow Word Cover & Reveal */}
          <h1
            id="hero-heading"
            data-bird-target="hero-heading"
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-zinc-950 max-w-5xl leading-[1.15] relative"
          >
            <RevealWords text={headlineText} baseDelay={100} stagger={60} />
          </h1>

          {/* Subtitle with Staggered Light Yellow Word Cover & Reveal */}
          <p className="text-xl sm:text-2xl text-zinc-700 max-w-3xl font-normal leading-relaxed">
            <RevealWords text={subtitleText} baseDelay={750} stagger={30} />
          </p>

          {/* Hero CTA Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
            <Link href="#waitlist">
              <Button
                size="large"
                className="h-14 px-10 text-base sm:text-lg rounded-full font-semibold shadow-lg hover:shadow-xl cursor-pointer"
              >
                <span>Join the waitlist</span>
                <ArrowRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Terminal Screenshot Preview with Scroll 3D Perspective Animation */}
          <div className="w-full pt-12 sm:pt-16 max-w-5xl">
            <ScrollImageEffect maxTilt={14} scaleRange={[0.92, 1]}>
              <div className="sky-glow-card relative mx-auto rounded-3xl border border-sky-200/90 bg-white/90 p-2.5 sm:p-3 shadow-2xl transition-all duration-300 backdrop-blur-md">
                <CornerSparks />
                <div className="relative aspect-[1264/848] w-full overflow-hidden rounded-2xl bg-zinc-950">
                  <Image
                    src="/assets/hero-terminal.webp"
                    alt="Terminal window displaying a completed vulnerability scan with three findings in ./app."
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 95vw, 1200px"
                  />
                </div>
              </div>
            </ScrollImageEffect>
          </div>
        </div>
      </div>
    </section>
  );
}
