"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, ShieldAlert, AlertTriangle, CheckCircle2, Lock, User, Mail } from "lucide-react";
import { signInWithGoogleOAuth } from "@/lib/supabase-client";

// Official Google G multi-color SVG icon
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

export default function LoginPage() {
  const router = useRouter();

  // Form states
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [capsLockActive, setCapsLockActive] = React.useState(false);

  // Status states
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Anti-Brute-Force Lockout (Security Guardrail)
  const [failedAttempts, setFailedAttempts] = React.useState(0);
  const [lockoutRemaining, setLockoutRemaining] = React.useState(0);

  // Restore lockout state from sessionStorage on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLock = sessionStorage.getItem("wren_lockout_until");
      if (storedLock) {
        const remaining = Math.ceil((parseInt(storedLock, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutRemaining(remaining);
        } else {
          sessionStorage.removeItem("wren_lockout_until");
        }
      }
    }
  }, []);

  // Lockout countdown timer
  React.useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const interval = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          sessionStorage.removeItem("wren_lockout_until");
          setError(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutRemaining]);

  // Detect input type: Gmail, standard email, or username
  const detectedType = React.useMemo(() => {
    const trimmed = identifier.trim().toLowerCase();
    if (!trimmed) return null;
    if (trimmed.endsWith("@gmail.com")) return "gmail";
    if (trimmed.includes("@")) return "email";
    return "username";
  }, [identifier]);

  // Caps Lock keyboard listener for security UX
  const handleKeyModifier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(e.getModifierState("CapsLock"));
  };

  // Google OAuth Handler
  const handleGoogleAuth = async () => {
    if (lockoutRemaining > 0) return;
    setError(null);
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogleOAuth();
      if (error) {
        setError("Failed to authenticate with Google. Please try again.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 400);
      }
    } catch {
      setError("An unexpected error occurred during Google sign in.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Email/Username + Password Form Submit
  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) return;

    setError(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter your email, Gmail, or username.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: cleanId,
          password,
          rememberMe,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);

        if (res.status === 429 || nextAttempts >= 5) {
          const lockSec = data.retryAfter || 60;
          setLockoutRemaining(lockSec);
          sessionStorage.setItem("wren_lockout_until", (Date.now() + lockSec * 1000).toString());
          setError(`Too many failed attempts. Login locked for ${lockSec}s to prevent brute-force.`);
        } else {
          setError(data.error || "Invalid email, username, or password.");
        }
        return;
      }

      // Success
      setSuccess(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "wren_auth_user",
          JSON.stringify({
            identifier: data.user.identifier,
            authenticatedAt: data.user.authenticatedAt,
          })
        );
      }
      setTimeout(() => router.push("/dashboard"), 400);
    } catch {
      setError("Network error. Could not connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  const isFormLocked = lockoutRemaining > 0;
  const isAnyLoading = loading || googleLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950">Welcome back</h1>
        <p className="text-xs text-zinc-600">
          Sign in to your Wren Security account to access your workspace.
        </p>
      </div>

      {/* Lockout Banner */}
      {isFormLocked && (
        <div
          role="alert"
          className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-medium animate-pulse"
        >
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            Security Lockout Active: Too many failed attempts. Try again in{" "}
            <strong>{lockoutRemaining}s</strong>.
          </span>
        </div>
      )}

      {/* Error Alert */}
      {error && !isFormLocked && (
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
          <span>Authenticated! Redirecting to your dashboard...</span>
        </div>
      )}

      {/* Google OAuth Action */}
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleAuth}
          disabled={isAnyLoading || isFormLocked}
          className="w-full h-11 rounded-xl flex items-center justify-center gap-3 font-medium border-sky-200/90 bg-white/95 hover:bg-sky-50/70 text-zinc-800 shadow-xs transition-all duration-150 active:scale-[0.99]"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          <span>Continue with Google</span>
        </Button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center my-2">
        <div className="border-t border-sky-200/80 w-full" />
        <span className="bg-white/90 px-3 text-[11px] uppercase tracking-wider text-sky-900/80 font-bold absolute rounded-full">
          or continue with
        </span>
      </div>

      {/* Credential Form */}
      <form onSubmit={handleCredentialSubmit} className="space-y-4" noValidate>
        {/* Identifier: Email, Gmail, or Username */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="identifier-input" className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
              <span>Email, Gmail, or Username</span>
            </label>
            {detectedType && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800">
                {detectedType === "gmail" ? "Gmail" : detectedType === "email" ? "Email" : "Username"}
              </span>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              {detectedType === "username" ? (
                <User className="h-4 w-4" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
            </div>
            <Input
              id="identifier-input"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError(null);
              }}
              disabled={isAnyLoading || isFormLocked}
              placeholder="you@gmail.com or username"
              required
              maxLength={100}
              className="h-10 pl-9 rounded-xl bg-white/95 border-sky-200/90 text-sm focus-visible:ring-sky-600"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password-input" className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
              <span>Password</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-sky-800 hover:text-sky-950 hover:underline"
              tabIndex={-1}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <Lock className="h-4 w-4" />
            </div>
            <Input
              id="password-input"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={handleKeyModifier}
              onKeyUp={handleKeyModifier}
              disabled={isAnyLoading || isFormLocked}
              placeholder="Enter your password"
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

          {/* CapsLock Warning Indicator */}
          {capsLockActive && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium pt-0.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Caps Lock is ON</span>
            </div>
          )}
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isAnyLoading || isFormLocked}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-sky-600 cursor-pointer"
            />
            <span className="text-xs text-zinc-600 font-medium">Keep me signed in for 30 days</span>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isAnyLoading || isFormLocked}
          className="w-full h-11 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-semibold text-sm shadow-md transition-all duration-150 active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying credentials...</span>
            </span>
          ) : isFormLocked ? (
            `Locked (${lockoutRemaining}s)`
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Footer Navigation */}
      <div className="text-center text-xs text-zinc-600 pt-1 space-y-2 border-t border-sky-100">
        <div>
          <span>New to Wren? </span>
          <Link href="/signup" className="text-sky-900 font-bold hover:underline">
            Create an account
          </Link>
        </div>
        <div className="text-[11px] text-zinc-400">
          Protected by Wren Shield with constant-time cryptographic verification.
        </div>
      </div>
    </div>
  );
}
