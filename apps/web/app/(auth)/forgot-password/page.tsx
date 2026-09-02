"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowLeft, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email or Gmail address.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">Reset your password</h1>
        <p className="text-xs text-zinc-600">
          Enter your verified email or Gmail and we will send you a secure recovery link.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium"
        >
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="space-y-4 text-center py-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-zinc-900">Check your inbox</h2>
            <p className="text-xs text-zinc-600 max-w-xs mx-auto">
              If an account exists for <strong className="text-zinc-900">{email}</strong>, you will receive password reset instructions shortly.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-sky-900 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-800">Email or Gmail Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                <Mail className="h-4 w-4" />
              </div>
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                placeholder="you@gmail.com"
                required
                maxLength={100}
                className="h-10 pl-9 rounded-xl bg-white/95 border-sky-200/90 text-sm focus-visible:ring-sky-600"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-sm shadow-md transition-all duration-150 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending recovery email...</span>
              </span>
            ) : (
              "Send password reset link"
            )}
          </Button>

          <div className="text-center pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-950 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to sign in</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
