import * as React from "react";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const links = [
    { label: "The problem", href: "/#problem" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Demo", href: "/#demo" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Early access", href: "/#waitlist" },
    { label: "Docs", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
  ];

  return (
    <footer className="border-t border-sky-200/70 bg-transparent py-14 sm:py-16 text-zinc-700">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          {/* Logo & Brand */}
          <div className="space-y-3 max-w-xs">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative h-8 w-8 rounded-full overflow-hidden border border-zinc-200/90 bg-white shadow-xs shrink-0 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/assets/bird-logo.png"
                  alt="Wren Logo"
                  fill
                  className="object-cover scale-110"
                  sizes="32px"
                />
              </div>
              <span className="font-semibold text-lg tracking-tight text-zinc-950">Wren</span>
            </Link>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Static vulnerability scanner specifically tailored for vibe-coded and AI-built applications.
            </p>
          </div>

          {/* Product Menu Column */}
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-900">
              Product
            </div>
            <ul className="flex flex-col space-y-2.5">
              {links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-700 hover:text-zinc-950 transition-colors font-medium"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-sky-200/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <div>© 2026 Wren. All rights reserved.</div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-zinc-950 transition-colors underline underline-offset-4 font-medium">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-zinc-950 transition-colors underline underline-offset-4 font-medium">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
