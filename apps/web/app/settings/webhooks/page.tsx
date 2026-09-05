"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";
import type { RuntimeWebhookConfig } from "@wren/shared-types";
import {
  BellRing,
  ShieldCheck,
  ArrowLeft,
  Lock,
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
    <div className="min-h-screen flex flex-col bg-transparent selection:bg-sky-900 selection:text-white relative overflow-x-clip">
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-36 pb-20 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/audit"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Runtime Audit Stream
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950">
            Runtime Security Webhook Settings
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 mt-2 max-w-2xl leading-relaxed">
            Configure automated outbound webhooks to receive signed alerts
            immediately when an agent trips destructive action or credential
            exfiltration policies.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white/85 border border-sky-200/80 backdrop-blur-md shadow-xs space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center justify-between pb-5 border-b border-sky-100">
              <div>
                <h3 className="text-sm font-bold text-zinc-950">
                  Enable Outbound Alert Webhooks
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Send cryptographic webhooks whenever runtime threat rules trip.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
              </label>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700">
                Webhook Destination URL
              </label>
              <input
                type="url"
                placeholder="https://api.yourdomain.com/webhooks/wren-alerts"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-sky-200/80 text-xs text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-mono shadow-xs"
              />
              <p className="text-[11px] text-zinc-500">
                Payloads are delivered via POST with signature header{" "}
                <code className="text-sky-700 font-mono font-medium">
                  X-Wren-Signature-256
                </code>
                .
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700">
                  HMAC Signing Secret
                </label>
                <button
                  type="button"
                  onClick={handleRegenerateSecret}
                  className="text-xs text-sky-700 hover:text-sky-900 font-semibold"
                >
                  Regenerate Secret
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={secret}
                  className="w-full px-4 py-2.5 rounded-xl bg-sky-50/60 border border-sky-200/80 text-xs text-sky-950 font-mono select-all focus:outline-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={handleCopySecret}
                  className="rounded-xl border-sky-200 bg-white hover:bg-sky-50 text-zinc-700 text-xs gap-1.5 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-500" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700">
                Minimum Alert Severity Threshold
              </label>
              <select
                value={minSeverity}
                onChange={(e) =>
                  setMinSeverity(e.target.value as "all" | "high" | "critical")
                }
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-sky-200/80 text-xs text-zinc-950 focus:outline-none focus:ring-2 focus:ring-sky-500/20 shadow-xs"
              >
                <option value="critical">Critical Only (Highest Alert Priority)</option>
                <option value="high">High &amp; Critical (Recommended)</option>
                <option value="all">All Threat Alerts (Verbose Stream)</option>
              </select>
            </div>

            {statusMessage && (
              <div
                className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
                  statusMessage.includes("success") ||
                  statusMessage.includes("queued")
                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                    : "bg-rose-50 text-rose-900 border border-rose-200"
                }`}
              >
                {statusMessage.includes("success") ||
                statusMessage.includes("queued") ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-sky-100">
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={handleTestWebhook}
                disabled={testing || !url}
                className="w-full sm:w-auto rounded-full border-sky-200 bg-white hover:bg-sky-50 text-zinc-800 text-xs font-semibold gap-1.5"
              >
                {testing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-sky-600" />
                )}
                Send Test Ping
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="small"
                disabled={saving}
                className="w-full sm:w-auto rounded-full px-6 text-xs font-semibold shadow-xs"
              >
                {saving ? "Saving Configuration..." : "Save Webhook Settings"}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-8 p-6 rounded-3xl bg-white/70 border border-sky-200/60 backdrop-blur-sm space-y-3">
          <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
            <Lock className="w-4 h-4 text-sky-600" />
            Verifying Webhook Signatures
          </h3>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Every webhook request includes an{" "}
            <code className="text-sky-700 font-mono font-medium">
              X-Wren-Signature-256
            </code>{" "}
            header formatted as{" "}
            <code className="text-zinc-800 font-mono">
              t=&lt;timestamp&gt;,v1=&lt;hmac&gt;
            </code>
            . Compute the HMAC-SHA256 signature using your secret and the raw
            payload string prefixed with the timestamp:{" "}
            <code className="text-zinc-800 font-mono">
              hash_hmac(&apos;sha256&apos;, &quot;$t.$body&quot;, $secret)
            </code>
            . Reject any requests outside a 300-second tolerance window to prevent
            replay attacks.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
