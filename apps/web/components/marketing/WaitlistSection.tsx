"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CornerSparks } from "@/components/ui/card";
import { CheckCircle2, Loader2, ArrowRight, Building2 } from "lucide-react";

export function WaitlistSection() {
  const [email, setEmail] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    setStatus("loading");
    setTimeout(() => {
      setStatus("success");
    }, 600);
  };

  const companies = [
    {
      name: "OpenAI",
      symbol: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.259 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7466-7.0729z" />
        </svg>
      ),
    },
    {
      name: "Anthropic",
      symbol: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M13.827 3.5h3.696L24 20.5h-3.696l-6.477-17zM0 20.5 6.477 3.5h3.696L3.696 20.5H0zm8.38-5.32h4.524l.98 2.58H7.4l.98-2.58z" />
        </svg>
      ),
    },
    {
      name: "Vercel",
      symbol: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M24 22.525H0l12-21.05 12 21.05z" />
        </svg>
      ),
    },
    {
      name: "Supabase",
      symbol: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M21.362 9.354H12V.302a.3.3 0 0 0-.525-.2l-8.8 10.7a.3.3 0 0 0 .232.49h9.455v9.052a.3.3 0 0 0 .525.2l8.8-10.7a.3.3 0 0 0-.232-.49h-.093z" />
        </svg>
      ),
    },
    {
      name: "Linear",
      symbol: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M3.003 12a9 9 0 0 1 15.364-6.364l-12.728 12.728A8.966 8.966 0 0 1 3.003 12zm2.633 7.778 12.728-12.728A8.999 8.999 0 0 1 5.636 19.778z" />
        </svg>
      ),
    },
    {
      name: "Stripe",
      symbol: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697.5 12.83.5 6.64.5 2.5 3.75 2.5 8.743c0 4.004 2.518 6.07 6.674 7.55 2.585.922 3.498 1.608 3.498 2.612 0 .977-.852 1.488-2.298 1.488-2.316 0-5.187-1.127-6.98-2.195l-.946 5.568c1.867.898 4.792 1.484 7.625 1.484 6.362 0 10.927-3.15 10.927-8.406 0-4.322-2.73-6.23-7.024-7.794z" />
        </svg>
      ),
    },
    {
      name: "Cursor",
      symbol: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M2.5 2.5h19v19H2.5z M6.5 6.5v11l4-4 3 6 2-1-3-6 5-1z" />
        </svg>
      ),
    },
    {
      name: "Raycast",
      symbol: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M15.5 2.5l6 6-9 9-6-6 9-9zM2.5 15.5l6 6-3 3-6-6 3-3z" />
        </svg>
      ),
    },
    {
      name: "Resend",
      symbol: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M3 4h18v4H7v4h12v4H7v4h14v4H3V4z" />
        </svg>
      ),
    },
    {
      name: "Loom",
      symbol: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="waitlist" className="py-20 sm:py-28 bg-transparent overflow-hidden">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center space-y-12">

          <div className="space-y-6 max-w-2xl">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-950 leading-[1.15]">
              Secure your AI apps before your users do.
            </h2>

            <p className="text-base sm:text-lg text-zinc-700 font-normal leading-relaxed">
              Wren is in private beta for indie hackers, founders, and engineering teams. Enter your email to claim your priority CLI token.
            </p>

            <div className="sky-glow-card sky-glow-emerald mx-auto relative w-full max-w-md p-6 sm:p-7 rounded-3xl border border-sky-200/90 bg-white/90 shadow-xl backdrop-blur-md">
              <CornerSparks color="emerald" />
              {status === "success" ? (
                <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 animate-in fade-in zoom-in-95">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <span className="text-sm font-semibold">You&apos;re on the list! We&apos;ll email your access key shortly.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (status === "error") setStatus("idle");
                      }}
                      placeholder="you@example.com"
                      required
                      className="h-12 rounded-xl bg-white border-sky-200 text-sm px-4 shadow-xs"
                    />
                    <Button
                      type="submit"
                      disabled={status === "loading"}
                      size="default"
                      className="h-12 rounded-xl px-7 font-semibold shrink-0 cursor-pointer"
                    >
                      {status === "loading" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span>Request access</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                  {status === "error" && (
                    <p className="text-xs text-red-600 font-medium text-left px-1">{errorMessage}</p>
                  )}

                  <div className="pt-2 text-left space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-600 font-medium">
                      <span>Beta Seats Reserved</span>
                      <strong className="text-sky-950 font-bold">148 / 200 (74%)</strong>
                    </div>
                    <div className="h-2 w-full rounded-full bg-sky-100/80 overflow-hidden">
                      <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-1000" />
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full pt-16 pb-6 overflow-hidden select-none">
        <div className="text-center space-y-1 mb-8">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center justify-center gap-2">
            <Building2 className="h-4 w-4 text-sky-700" />
            <span>Trusted by developers building at fast-growing companies</span>
          </div>
        </div>

        <div className="relative w-full py-8">
          <div className="coaster-track flex items-center gap-14 sm:gap-20">
            {[...companies, ...companies, ...companies].map((company, idx) => (
              <div
                key={`${company.name}-${idx}`}
                style={{ animationDelay: `${idx * -0.35}s` }}
                className="coaster-item flex items-center gap-3 text-zinc-800 hover:text-sky-950 transition-colors cursor-pointer shrink-0 group px-4 py-2"
              >
                <div className="text-zinc-900 group-hover:text-sky-600 group-hover:scale-125 transition-all duration-300 drop-shadow-[0_4px_10px_rgba(56,189,248,0.35)]">
                  {company.symbol}
                </div>
                <span className="font-bold text-lg sm:text-2xl tracking-tight font-sans text-zinc-900 group-hover:text-sky-900 transition-colors drop-shadow-sm">
                  {company.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
