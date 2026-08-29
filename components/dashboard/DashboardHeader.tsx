"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="h-16 border-b border-sky-200/70 bg-white/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Brand & Project Switcher */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative h-7 w-7 rounded-full overflow-hidden border border-zinc-200/90 bg-white shadow-xs shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/assets/bird-logo.png"
              alt="Wren Logo"
              fill
              className="object-cover scale-110"
              sizes="28px"
            />
          </div>
          <span className="font-bold text-base text-zinc-950 tracking-tight">Wren</span>
        </Link>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg border border-sky-200/80 text-xs font-medium text-sky-950 bg-sky-50/70">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>acme-corp / vibe-crm</span>
        </div>
      </div>

      {/* Right Action Icons & Profile */}
      <div className="flex items-center gap-3">
        <Link href="/docs" target="_blank" className="hidden sm:flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-950 transition-colors mr-2">
          <span>Docs</span>
          <ExternalLink className="h-3 w-3" />
        </Link>

        <Link href="/scans/scan-9021">
          <Button size="small" className="gap-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" />
            <span>New Scan</span>
          </Button>
        </Link>

        <div className="h-8 w-8 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center border border-zinc-800 shadow-sm ml-2">
          AV
        </div>
      </div>
    </header>
  );
}
