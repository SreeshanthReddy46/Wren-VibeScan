# Design Spec: Runtime Agent Auditing (v2.0 Ingestion, Rules Engine & Webhook Alerting)

**Date**: 2026-09-05  
**Status**: Approved  
**Topic**: Runtime Agent Auditing & Threat Detection

---

## 1. Overview & Context

Wren's core capability is discovering vulnerabilities in AI-generated code before deployment. However, the wider-aperture expansion in v2.0 extends security posture into **runtime agent execution**: auditing live actions performed by customer production agents (e.g. customer-service bots, coding copilot agents, data assistants) against declared intent, catching unauthorized destructive operations, privilege escalations, and credential/PII exfiltration, and firing cryptographic webhook alerts.

This design concrete-engineers the runtime backend:
1. **High-Throughput Ingestion Endpoint (`/api/v1/agent-events`)**: Ingests customer agent tool calls with `<10ms` latency and `202 Accepted` queueing.
2. **Runtime Rules Engine (`@wren/core`)**: Evaluates incoming live event streams against deterministic threat policies.
3. **Event Bus & Webhook Dispatcher**: Durable event processing (Inngest with in-memory worker fallback) delivering HMAC-SHA256 signed webhook alerts with exponential backoff retries.
4. **Audit Dashboard**: Real-time observability UI displaying live agent actions, threat detections, and webhook settings.

---

## 2. Shared Data Contracts (`packages/shared-types`)

### 2.1 Ingested Customer Agent Event
```typescript
export interface CustomerAgentEvent {
  id: string;                         // Unique event ID (e.g. "evt_01j7x8k9...")
  agentId: string;                    // Registered customer agent identifier (e.g. "billing-support-bot")
  sessionId?: string;                 // Conversation or execution run ID
  environment?: string;               // "production" | "staging" | "dev"
  action: string;                     // Tool or function executed (e.g. "delete_user", "sql_query")
  declaredIntent?: string;            // Plain-English stated goal (e.g. "Export user invoice history")
  arguments: Record<string, unknown>; // Key-value parameters passed to the tool
  result?: {                          // Optional tool output
    status: "success" | "error";
    outputSnippet?: string;
  };
  metadata?: Record<string, unknown>;
  timestamp: string;                  // ISO-8601 string
}
```

### 2.2 Runtime Rule Violation & Alert
```typescript
export interface RuntimeRuleViolation {
  ruleId: string;
  ruleName: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "destructive_action" | "privilege_escalation" | "credential_leak" | "pii_exposure" | "scope_violation";
  description: string;
  evidence: string;
  suggestedAction: string;
}

export interface RuntimeAlert {
  id: string;
  eventId: string;
  agentId: string;
  ruleId: string;
  ruleName: string;
  severity: "critical" | "high" | "medium" | "low";
  category: RuntimeRuleViolation["category"];
  description: string;
  evidence: string;
  suggestedAction: string;
  status: "active" | "acknowledged" | "resolved";
  webhookSent: boolean;
  webhookStatus?: "delivered" | "failed" | "pending";
  createdAt: string;
}

export interface RuntimeWebhookConfig {
  id: string;
  projectId: string;
  url: string;
  secret: string;                     // HMAC-SHA256 signing secret (whsec_...)
  enabled: boolean;
  minSeverity: "all" | "high" | "critical";
  createdAt: string;
}
```

---

## 3. Database Architecture (`apps/web/lib/runtime-audit-schema.sql`)

```sql
-- 1. Stream of ingested customer agent actions
CREATE TABLE IF NOT EXISTS runtime_agent_events (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT,
  environment TEXT DEFAULT 'production',
  action TEXT NOT NULL,
  declared_intent TEXT,
  arguments JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  metadata JSONB DEFAULT '{}',
  tripped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tripped security alerts and violations
CREATE TABLE IF NOT EXISTS runtime_alerts (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES runtime_agent_events(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'critical' | 'high' | 'medium' | 'low'
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- 'active' | 'acknowledged' | 'resolved'
  webhook_sent BOOLEAN DEFAULT FALSE,
  webhook_status TEXT, -- 'delivered' | 'failed' | 'pending'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customer Webhook configuration
CREATE TABLE IF NOT EXISTS runtime_webhook_configs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  min_severity TEXT DEFAULT 'high',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_events_agent_id ON runtime_agent_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_runtime_alerts_agent_id ON runtime_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_runtime_alerts_status ON runtime_alerts(status);

ALTER PUBLICATION supabase_realtime ADD TABLE runtime_agent_events, runtime_alerts;
```

---

## 4. Runtime Rules Engine (`packages/core/src/runtime/`)

### 4.1 Modular Rule Interface
Each rule evaluates a live `CustomerAgentEvent` in `<1ms`:

```typescript
export interface RuntimeRule {
  id: string;
  name: string;
  category: RuntimeRuleViolation["category"];
  defaultSeverity: RuntimeRuleViolation["severity"];
  evaluate: (event: CustomerAgentEvent) => RuntimeRuleViolation | null;
}
```

### 4.2 Initial Built-in Rules
1. **`WREN-RUN-001` (Unsanctioned Destructive Operation)**:
   - Evaluates whether `action` executes destructive operations (`delete_user`, `drop_database`, `truncate_table`, `purge_records`, `destroy_*`).
   - Checks if `declaredIntent` explicitly authorizes the destruction (e.g., "Delete deactivated user accounts older than 90 days"). If unprompted or conflicting, trips as `critical`.
2. **`WREN-RUN-002` (Privilege Escalation / Admin Role Grant)**:
   - Catches actions granting administrative access or modifying authorization controls (`grant_admin`, `elevate_privilege`, `assign_role` with `admin` / `root` / `superuser`).
   - Trips as `critical` preventing compromised agents from expanding permissions.
3. **`WREN-RUN-003` (Active Credential / Secret in Action Arguments)**:
   - Scans serialized arguments against regex patterns for exposed OpenAI (`sk-proj-...`), Stripe (`sk_live_...`), Anthropic (`sk-ant-...`), AWS access keys (`AKIA...`), and Bearer authorization tokens.
   - Trips as `high` alerting that secrets are leaking through tool calls.
4. **`WREN-RUN-004` (Unmasked Financial / PII Exposure in Arguments)**:
   - Detects raw credit card numbers (Luhn check), Social Security numbers, or RSA/EC private keys (`-----BEGIN PRIVATE KEY-----`) in action inputs.
   - Trips as `high`.

### 4.3 Engine Coordinator (`evaluateRuntimeAgentEvent`)
```typescript
export function evaluateRuntimeAgentEvent(
  event: CustomerAgentEvent,
  customRules?: RuntimeRule[]
): {
  tripped: boolean;
  violations: RuntimeRuleViolation[];
  evaluatedRuleCount: number;
}
```

---

## 5. Ingestion API & Webhook Dispatcher

### 5.1 Endpoint: `POST /api/v1/agent-events`
- Accepts single event or batch `{ events: CustomerAgentEvent[] }`.
- Validates payload structure; missing `agentId` or `action` returns `400 Bad Request`.
- Stored into `runtime_agent_events`.
- Immediately returns `202 Accepted`:
  ```json
  {
    "success": true,
    "eventId": "evt_...",
    "status": "queued"
  }
  ```
- Dispatches event to Inngest (`agent.action.logged`) and triggers in-process worker.

### 5.2 Cryptographic Webhook Signer (`packages/core/src/runtime/webhook-signer.ts`)
- Computes SHA-256 HMAC of the payload timestamp and JSON body using the customer's shared secret:
  ```typescript
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payloadString}`)
    .digest("hex");
  ```
- Header: `X-Wren-Signature-256: t=${timestamp},v1=${signature}`.
- Prevents replay attacks and verifies authenticity.

### 5.3 Alerting Pipeline (`apps/web/lib/runtime-dispatcher.ts`)
- If rule engine produces violations:
  1. Inserts records into `runtime_alerts`.
  2. Marks `runtime_agent_events.tripped = true`.
  3. Dispatches HTTP POST to all configured webhooks matching severity.
  4. Updates `webhook_status: 'delivered' | 'failed'`.

---

## 6. Audit & Webhook Dashboard (`apps/web`)

1. **Live Audit Stream (`apps/web/app/audit/page.tsx`)**:
   - Live stream of customer agent events with filtering by `agentId` and `environment`.
   - Alert summary banner with count of `active` critical/high violations.
   - Detail drawer showing full input parameters, highlighted violation evidence, and suggested remediation.
2. **Webhook Settings (`apps/web/app/settings/webhooks/page.tsx`)**:
   - Webhook URL input.
   - HMAC signing secret generator (`whsec_...`).
   - Severity trigger toggle (`all`, `high_and_critical`, `critical_only`).
   - "Send Test Webhook" trigger.

---

## 7. Verification Strategy
- **Unit Tests**:
  - `packages/core/tests/runtime/rules.test.ts`: Tests `WREN-RUN-001` through `WREN-RUN-004` on malicious vs benign events.
  - `packages/core/tests/runtime/webhook-signer.test.ts`: Validates HMAC signature generation and verification.
  - `packages/core/tests/runtime/engine.test.ts`: Tests `evaluateRuntimeAgentEvent` multi-rule dispatch.
- **Integration Tests**:
  - `packages/core/tests/runtime/api-ingest.test.ts`: Tests `POST /api/v1/agent-events` ingestion latency, validation, and webhook dispatch triggering.
- **Monorepo Build & Typecheck**:
  - `pnpm --filter @wren/core test`
  - `pnpm --filter web run build`
  - `pnpm typecheck` across all workspace packages.
