"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, AlertTriangle, CheckCircle2, Lock, User, Mail } from "lucide-react";
import { signInWithGoogleOAuth } from "@/lib/supabase-client";

function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();

  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Handle Google OAuth (directs directly to Google Accounts / Gmail)
  const handleGoogleAuth = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogleOAuth();
      if (error) {
        setError("Failed to authenticate with Google.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/"), 400);
      }
    } catch {
      setError("An error occurred during Google authentication.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle Credentials Signup
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      setError("Username must be at least 3 characters long.");
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      setError("Username can only contain letters, numbers, hyphens, and underscores.");
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address (e.g. user@gmail.com).");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      // In local dev/demo, simulate account creation and redirect to home
      setTimeout(() => {
        setSuccess(true);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "wren_auth_user",
            JSON.stringify({
              username: cleanUsername,
              email: cleanEmail,
              authenticatedAt: new Date().toISOString(),
            })
          );
        }
        setTimeout(() => router.push("/"), 400);
      }, 500);
    } catch {
      setError("An unexpected error occurred during signup.");
      setLoading(false);
    }
  };

  const isAnyLoading = loading || googleLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">Create your account</h1>
        <p className="text-xs text-zinc-600">
          Get started with Wren Security to scan and secure your vibe-coded apps.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium"
        >
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Notice */}
      {success && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Account created! Redirecting...</span>
        </div>
      )}

      {/* Google OAuth Action */}
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleAuth}
          disabled={isAnyLoading}
          className="w-full h-11 rounded-xl flex items-center justify-center gap-3 font-medium border-sky-200/90 bg-white/95 hover:bg-sky-50/70 text-zinc-800 shadow-xs transition-all duration-150 active:scale-[0.99]"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          <span>Sign up with Google</span>
        </Button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-2">
        <div className="border-t border-sky-200/80 w-full" />
        <span className="bg-white/90 px-3 text-[11px] uppercase tracking-wider text-sky-900/80 font-bold absolute rounded-full">
          or sign up with email
        </span>
      </div>

      {/* Signup Form */}
      <form onSubmit={handleSignupSubmit} className="space-y-4" noValidate>
        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
            <span>Username</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <User className="h-4 w-4" />
            </div>
            <Input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError(null);
              }}
              disabled={isAnyLoading}
              placeholder="choose a username"
              required
              maxLength={30}
              className="h-10 pl-9 rounded-xl bg-white/95 border-sky-200/90 text-sm focus-visible:ring-sky-600"
            />
          </div>
        </div>

        {/* Email or Gmail */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
            <span>Email or Gmail</span>
          </label>
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
              disabled={isAnyLoading}
              placeholder="you@gmail.com"
              required
              maxLength={100}
              className="h-10 pl-9 rounded-xl bg-white/95 border-sky-200/90 text-sm focus-visible:ring-sky-600"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
            <span>Password (min. 8 characters)</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <Lock className="h-4 w-4" />
            </div>
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              disabled={isAnyLoading}
              placeholder="Create a strong password"
              required
              maxLength={128}
              className="h-10 pl-9 pr-10 rounded-xl bg-white/95 border-sky-200/90 text-sm focus-visible:ring-sky-600"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isAnyLoading}
          className="w-full h-11 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-sm shadow-md transition-all duration-150 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Creating account...</span>
            </span>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      {/* Footer Navigation */}
      <div className="text-center text-xs text-zinc-600 pt-1 space-y-2 border-t border-sky-100">
        <div>
          <span>Already have an account? </span>
          <Link href="/login" className="text-sky-900 font-bold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
