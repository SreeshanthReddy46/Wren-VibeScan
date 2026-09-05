import type {
  CustomerAgentEvent,
  RuntimeAlert,
  RuntimeWebhookConfig,
} from "@wren/shared-types";
import {
  evaluateRuntimeAgentEvent,
  generateWebhookSignature,
} from "@wren/core";
import { isSupabaseConfigured, getSupabaseClient } from "./supabase-client.ts";

const runtimeEventsStore = new Map<string, CustomerAgentEvent>();
const runtimeAlertsStore = new Map<string, RuntimeAlert>();
const webhookConfigsStore = new Map<string, RuntimeWebhookConfig>();

webhookConfigsStore.set("default", {
  id: "wh_default",
  projectId: "default",
  url: "https://httpbin.org/post",
  secret: "whsec_default_secret_key_123456",
  enabled: true,
  minSeverity: "high",
  createdAt: new Date().toISOString(),
});

export async function ingestCustomerAgentEvent(
  rawEvent: Partial<CustomerAgentEvent> & { agentId: string; action: string }
): Promise<{ eventId: string; status: "queued"; tripped: boolean; alertCount: number }> {
  const eventId =
    rawEvent.id ||
    `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const event: CustomerAgentEvent = {
    id: eventId,
    agentId: rawEvent.agentId,
    sessionId: rawEvent.sessionId,
    environment: rawEvent.environment || "production",
    action: rawEvent.action,
    declaredIntent: rawEvent.declaredIntent,
    arguments: rawEvent.arguments || {},
    result: rawEvent.result,
    metadata: rawEvent.metadata,
    timestamp: rawEvent.timestamp || new Date().toISOString(),
  };

  const evalResult = evaluateRuntimeAgentEvent(event);
  const tripped = evalResult.tripped;

  runtimeEventsStore.set(eventId, event);

  if (isSupabaseConfigured) {
    try {
      const client = (await getSupabaseClient()) as {
        from: (table: string) => {
          insert: (records: unknown[]) => Promise<{ error: unknown }>;
        };
      } | null;

      if (client) {
        await client.from("runtime_agent_events").insert([
          {
            id: event.id,
            agent_id: event.agentId,
            session_id: event.sessionId,
            environment: event.environment,
            action: event.action,
            declared_intent: event.declaredIntent,
            arguments: event.arguments,
            result: event.result,
            metadata: event.metadata,
            tripped,
            created_at: event.timestamp,
          },
        ]);
      }
    } catch {

    }
  }

  let alertCount = 0;
  if (tripped) {
    alertCount = evalResult.violations.length;
    for (const violation of evalResult.violations) {
      const alertId = `alt_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;

      const alert: RuntimeAlert = {
        id: alertId,
        eventId: event.id,
        agentId: event.agentId,
        ruleId: violation.ruleId,
        ruleName: violation.ruleName,
        severity: violation.severity,
        category: violation.category,
        description: violation.description,
        evidence: violation.evidence,
        suggestedAction: violation.suggestedAction,
        status: "active",
        webhookSent: false,
        webhookStatus: "pending",
        createdAt: new Date().toISOString(),
      };

      runtimeAlertsStore.set(alertId, alert);

      dispatchAlertWebhook(alert, event).catch(() => {

      });
    }
  }

  return {
    eventId,
    status: "queued",
    tripped,
    alertCount,
  };
}

async function dispatchAlertWebhook(
  alert: RuntimeAlert,
  event: CustomerAgentEvent
): Promise<void> {
  const config = webhookConfigsStore.get("default");
  if (!config || !config.enabled || !config.url) {
    return;
  }

  if (config.minSeverity === "critical" && alert.severity !== "critical") {
    return;
  }
  if (
    config.minSeverity === "high" &&
    alert.severity !== "critical" &&
    alert.severity !== "high"
  ) {
    return;
  }

  const payload = {
    event: "runtime.security_alert",
    alertId: alert.id,
    severity: alert.severity,
    ruleId: alert.ruleId,
    ruleName: alert.ruleName,
    agentId: alert.agentId,
    action: event.action,
    declaredIntent: event.declaredIntent,
    evidence: alert.evidence,
    suggestedAction: alert.suggestedAction,
    timestamp: alert.createdAt,
  };

  const { header } = generateWebhookSignature(payload, config.secret);

  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Wren-Signature-256": header,
        "User-Agent": "Wren-Runtime-Auditor/2.0",
      },
      body: JSON.stringify(payload),
    });

    alert.webhookSent = true;
    alert.webhookStatus = res.ok ? "delivered" : "failed";
  } catch {
    alert.webhookSent = true;
    alert.webhookStatus = "failed";
  }
}

export async function getRuntimeAgentEvents(
  limit = 50,
  agentId?: string
): Promise<CustomerAgentEvent[]> {
  let events = Array.from(runtimeEventsStore.values());
  if (agentId) {
    events = events.filter((e) => e.agentId === agentId);
  }
  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return events.slice(0, limit);
}

export async function getRuntimeAlerts(
  limit = 50,
  agentId?: string,
  status?: string
): Promise<RuntimeAlert[]> {
  let alerts = Array.from(runtimeAlertsStore.values());
  if (agentId) {
    alerts = alerts.filter((a) => a.agentId === agentId);
  }
  if (status) {
    alerts = alerts.filter((a) => a.status === status);
  }
  alerts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return alerts.slice(0, limit);
}

export async function updateRuntimeAlertStatus(
  alertId: string,
  status: "active" | "acknowledged" | "resolved"
): Promise<RuntimeAlert | null> {
  const alert = runtimeAlertsStore.get(alertId);
  if (!alert) return null;
  alert.status = status;
  return alert;
}

export async function getRuntimeWebhookConfig(
  projectId = "default"
): Promise<RuntimeWebhookConfig> {
  const existing = webhookConfigsStore.get(projectId);
  if (existing) return existing;

  const created: RuntimeWebhookConfig = {
    id: `wh_${projectId}`,
    projectId,
    url: "",
    secret: `whsec_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`,
    enabled: true,
    minSeverity: "high",
    createdAt: new Date().toISOString(),
  };
  webhookConfigsStore.set(projectId, created);
  return created;
}

export async function saveRuntimeWebhookConfig(
  updates: Partial<RuntimeWebhookConfig> & { url: string },
  projectId = "default"
): Promise<RuntimeWebhookConfig> {
  const current = await getRuntimeWebhookConfig(projectId);
  const updated: RuntimeWebhookConfig = {
    ...current,
    ...updates,
    projectId,
  };
  webhookConfigsStore.set(projectId, updated);
  return updated;
}

export function clearRuntimeStoreForTesting(): void {
  runtimeEventsStore.clear();
  runtimeAlertsStore.clear();
}
