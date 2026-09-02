"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "The problem", href: "/#problem" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Demo", href: "/#demo" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Docs", href: "/docs" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex justify-center px-4 pt-4 sm:pt-6 transition-all duration-200">
      <nav
        className={cn(
          "w-full max-w-6xl rounded-full border border-zinc-200/80 bg-white/85 backdrop-blur-md px-4 sm:px-6 py-2.5 shadow-pill transition-all flex items-center justify-between",
          scrolled ? "bg-white/95 shadow-md border-zinc-300/80" : ""
        )}
        aria-label="Main Navigation"
      >
        {/* Full Edge-to-Edge Sketched Bird Logo & Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-800 rounded-lg p-0.5 group"
        >
          <div className="relative h-8 w-8 rounded-full overflow-hidden border border-zinc-200/90 bg-white shadow-xs shrink-0 transition-transform duration-300 group-hover:scale-105">
            <Image
              src="/assets/bird-logo.png"
              alt="Wren Logo"
              fill
              className="object-cover scale-110"
              priority
              sizes="32px"
            />
          </div>
          <span className="font-semibold text-lg tracking-tight text-zinc-900">Wren</span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-800 rounded-md px-1 py-0.5",
                  isActive ? "text-zinc-950 font-semibold" : "text-zinc-600"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* CTA Button */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button size="small" variant="ghost" className="rounded-full px-4 text-xs font-semibold text-zinc-700 hover:text-zinc-950">
              Sign in
            </Button>
          </Link>
          <Link href="/#waitlist">
            <Button size="small" variant="primary" className="rounded-full px-5 text-xs font-semibold">
              Join the waitlist
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-700 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-800 rounded-full"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-20 left-4 right-4 z-50 rounded-2xl border border-zinc-200/90 bg-white/98 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-zinc-700 hover:text-zinc-950 py-1"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-zinc-100 flex flex-col gap-2.5">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center rounded-xl py-2.5 text-zinc-800 font-semibold">
                  Sign in
                </Button>
              </Link>
              <Link href="/#waitlist" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" className="w-full justify-center rounded-xl py-2.5 font-semibold">
                  Join the waitlist
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
