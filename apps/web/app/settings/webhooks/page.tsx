"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { RuntimeWebhookConfig } from "@wren/shared-types";
import {
  BellRing,
  ShieldCheck,
  ArrowLeft,
  Lock,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Send,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export default function WebhookSettingsPage() {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [minSeverity, setMinSeverity] = useState<"all" | "high" | "critical">("high");
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/v1/webhooks/config");
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            setUrl(data.config.url || "");
            setSecret(data.config.secret || "");
            setMinSeverity(data.config.minSeverity || "high");
            setEnabled(data.config.enabled ?? true);
          }
        }
      } catch {

      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/v1/webhooks/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          secret,
          minSeverity,
          enabled,
        }),
      });

      if (res.ok) {
        setStatusMessage("Webhook configuration saved successfully.");
      } else {
        setStatusMessage("Failed to save webhook configuration.");
      }
    } catch {
      setStatusMessage("Failed to save webhook configuration.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestWebhook() {
    if (!url) {
      setStatusMessage("Please specify a webhook destination URL first.");
      return;
    }
    setTesting(true);
    setStatusMessage(null);
    try {

      const res = await fetch("/api/v1/agent-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "webhook-tester",
          action: "test_webhook_ping",
          declaredIntent: "Verify HMAC webhook delivery connectivity",
          arguments: { ping: true, timestamp: Date.now() },
        }),
      });

      if (res.ok) {
        setStatusMessage("Test event queued. Check your receiving webhook logs!");
      }
    } catch {
      setStatusMessage("Failed to dispatch test webhook.");
    } finally {
      setTesting(false);
    }
  }

  function handleCopySecret() {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRegenerateSecret() {
    const newSecret = `whsec_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    setSecret(newSecret);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-amber-500/30">

      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.12),rgba(255,255,255,0))] pointer-events-none" />

      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            href="/audit"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Runtime Audit Stream
          </Link>
        </div>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-3">
            <BellRing className="w-3.5 h-3.5" />
            HMAC-SHA256 Webhook Alerting
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Runtime Security Webhook Settings
          </h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
            Configure automated outbound webhooks to receive signed alerts
            immediately when an agent trips destructive action or credential
            exfiltration policies.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">

            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Enable Outbound Alert Webhooks
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Send cryptographic webhooks whenever runtime threat rules
                  trip.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Webhook Destination URL
              </label>
              <input
                type="url"
                placeholder="https://api.yourdomain.com/webhooks/wren-alerts"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60 font-mono"
              />
              <p className="text-[11px] text-zinc-500">
                Payloads are delivered via POST with signature header{" "}
                <code className="text-amber-400 font-mono">
                  X-Wren-Signature-256
                </code>
                .
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  HMAC Signing Secret
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateSecret}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Regenerate
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={secret}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-amber-400/90 font-mono select-all focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={handleCopySecret}
                  className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Use this secret with HMAC-SHA256 to verify incoming webhook
                authenticity and prevent replay attacks.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300">
                Minimum Severity Threshold
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { id: "critical", label: "Critical Only" },
                    { id: "high", label: "High & Critical" },
                    { id: "all", label: "All Severities" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMinSeverity(opt.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      minSeverity === opt.id
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={handleTestWebhook}
                disabled={testing || !url}
                className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white gap-1.5"
              >
                {testing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-cyan-400" />
                )}
                Send Test Webhook
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="small"
                disabled={saving}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : null}
                Save Configuration
              </Button>
            </div>

            {statusMessage && (
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-amber-300">
                {statusMessage}
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
