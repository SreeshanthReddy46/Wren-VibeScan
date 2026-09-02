"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Copy, Check, Shield, UserPlus, CreditCard } from "lucide-react";

export default function ProjectSettingsPage() {
  const [copiedKey, setCopiedKey] = React.useState(false);
  const apiKey = "wren_live_994a81fd82cb41209e51c890";

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
          Project Settings
        </h1>
        <p className="text-sm text-zinc-600">
          Manage your Wren API keys, scan automations, and team access.
        </p>
      </div>

      {/* API Key Section */}
      <Card className="rounded-2xl border-sky-200/80 bg-white/80 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-sky-800" />
              <h2 className="text-lg font-bold text-zinc-950">CLI &amp; CI/CD API Key</h2>
            </div>
            <p className="text-xs text-zinc-600">
              Use this key to authenticate `wren scan` in GitHub Actions or your local terminal.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={apiKey}
            readOnly
            className="font-mono text-xs bg-sky-50/70 border-sky-200 text-zinc-800 rounded-xl"
          />
          <Button
            size="small"
            variant="outline"
            onClick={handleCopyKey}
            className="gap-1.5 shrink-0 rounded-xl"
          >
            {copiedKey ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Key</span>
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Plan & Billing */}
      <Card className="rounded-2xl border-sky-200/80 bg-white/80 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-sky-800" />
              <h2 className="text-lg font-bold text-zinc-950">Current Subscription</h2>
            </div>
            <p className="text-xs text-zinc-600">
              You are currently on the <strong className="text-zinc-950">Pro Tier ($29/mo)</strong>.
            </p>
          </div>
          <Button size="small" variant="outline" className="rounded-xl">
            Manage Billing
          </Button>
        </div>
      </Card>

      {/* Team Members */}
      <Card className="rounded-2xl border-sky-200/80 bg-white/80 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-sky-800" />
              <h2 className="text-lg font-bold text-zinc-950">Team Members</h2>
            </div>
            <p className="text-xs text-zinc-600">
              Invite your teammates to view vulnerability reports and inspect code diffs.
            </p>
          </div>
          <Button size="small" className="rounded-xl">
            Invite Teammate
          </Button>
        </div>
      </Card>
    </div>
  );
}
