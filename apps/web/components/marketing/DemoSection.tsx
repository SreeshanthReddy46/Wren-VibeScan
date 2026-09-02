"use client";

import * as React from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { ScrollImageEffect } from "@/components/marketing/ScrollImageEffect";
import { CornerSparks } from "@/components/ui/card";
import { ScrambleWord } from "@/components/marketing/ScrambleText";

export function DemoSection() {
  const [videoModalOpen, setVideoModalOpen] = React.useState(false);

  const headingWords = ["See", "a", "scan", "run", "end", "to", "end"];

  return (
    <section id="demo" className="py-20 sm:py-28 bg-transparent text-zinc-950 overflow-hidden">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Text Content with Matrix / Symbol Scramble Hover Animation */}
          <div className="lg:col-span-5 space-y-6 demo-text-box group/text">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 leading-[1.15] select-none">
              {headingWords.map((word, idx) => (
                <ScrambleWord key={idx} word={word} />
              ))}
            </h2>

            <p className="text-base sm:text-lg text-zinc-700 font-normal leading-relaxed demo-paragraph">
              A two-minute walkthrough of Wren scanning a small app, flagging issues, and producing a report you can act on.
            </p>
          </div>

          {/* Right Video Lightbox with Scroll 3D Perspective Animation */}
          <div className="lg:col-span-7">
            <ScrollImageEffect maxTilt={10} scaleRange={[0.94, 1]}>
              <div className="sky-glow-card sky-glow-gold relative group cursor-pointer rounded-3xl overflow-visible border border-sky-200/90 bg-white/90 shadow-2xl transition-all duration-300 p-2 sm:p-2.5 backdrop-blur-md">
                <CornerSparks color="gold" />
                <button
                  type="button"
                  onClick={() => setVideoModalOpen(true)}
                  className="w-full block relative aspect-[1264/848] text-left focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-2xl overflow-hidden bg-zinc-950 cursor-pointer"
                  aria-label="Play product demo video"
                >
                  <Image
                    src="/assets/demo-dashboard.webp"
                    alt="Security scan report dashboard showing severity totals and three code security findings."
                    fill
                    className="object-cover transition-opacity duration-300 group-hover:opacity-90"
                    sizes="(max-width: 768px) 100vw, 700px"
                  />

                  {/* Dark Overlay */}
                  <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/15" />

                  {/* Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white/95 text-zinc-950 flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-white">
                      <Play className="h-7 w-7 sm:h-8 sm:w-8 fill-zinc-950 ml-1" />
                    </div>
                  </div>
                </button>
              </div>
            </ScrollImageEffect>
          </div>
        </div>
      </div>

      {/* Video Lightbox Modal */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <div className="relative aspect-video w-full bg-black">
          <DialogClose onClose={() => setVideoModalOpen(false)} />
          <iframe
            src="https://www.youtube-nocookie.com/embed/pRnr9hRooAM?autoplay=1"
            title="Wren Product Demo Walkthrough"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </Dialog>
    </section>
  );
}
