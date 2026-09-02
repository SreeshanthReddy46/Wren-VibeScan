"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Github, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard");
    }, 600);
  };

  const handleGitHubAuth = () => {
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 500);
  };

  return (
    <Card className="rounded-3xl border border-sky-200/80 bg-white/85 backdrop-blur-md shadow-xl p-2">
      <CardContent className="p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Sign in</h1>
          <p className="text-xs text-zinc-600">Sign in to access Wren and view your scan reports.</p>
        </div>

        {/* GitHub OAuth Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGitHubAuth}
          disabled={loading}
          className="w-full h-11 rounded-xl flex items-center justify-center gap-2.5 font-medium border-sky-200 hover:bg-sky-50"
        >
          <Github className="h-4 w-4" />
          <span>Continue with GitHub</span>
        </Button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-sky-200/80 w-full" />
          <span className="bg-white/90 px-3 text-xs uppercase tracking-wider text-sky-900 font-semibold absolute rounded-full">
            or
          </span>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="you@example.com"
              required
              className="h-10 rounded-xl bg-white/90 border-sky-200"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700">Password</label>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter your password"
              required
              className="h-10 rounded-xl bg-white/90 border-sky-200"
            />
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-medium"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>

        {/* Footer links */}
        <div className="text-center text-xs text-zinc-600 pt-2 space-y-1.5">
          <div>
            <Link href="/signup" className="text-sky-900 font-bold hover:underline">
              Don&apos;t have an account? Sign up
            </Link>
          </div>
          <div>
            <Link href="/terms" className="hover:underline">
              Terms & Privacy
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
