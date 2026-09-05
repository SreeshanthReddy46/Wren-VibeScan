import type { CustomerAgentEvent, RuntimeRuleViolation } from "@wren/shared-types";
import type { RuntimeRule } from "./types";

export const ruleUnsanctionedDestructiveAction: RuntimeRule = {
  id: "WREN-RUN-001",
  name: "Unsanctioned Destructive Operation",
  category: "destructive_action",
  defaultSeverity: "critical",
  evaluate(event: CustomerAgentEvent): RuntimeRuleViolation | null {
    const actionLower = event.action.toLowerCase();
    const isDestructiveAction =
      /^(delete_|drop_|truncate_|purge_|destroy_|remove_all)/i.test(actionLower) ||
      (actionLower.includes("sql") &&
        /\b(DROP|TRUNCATE|DELETE\s+FROM)\b/i.test(
          JSON.stringify(event.arguments)
        ));

    if (!isDestructiveAction) {
      return null;
    }

    const intent = (event.declaredIntent || "").toLowerCase();
    const intentAuthorizes =
      /\b(delete|drop|truncate|purge|destroy|clean\s*up|decommission)\b/i.test(
        intent
      );

    if (!intentAuthorizes) {
      return {
        ruleId: "WREN-RUN-001",
        ruleName: "Unsanctioned Destructive Operation",
        severity: "critical",
        category: "destructive_action",
        description: `Agent executed destructive action '${event.action}' unprompted by declared intent.`,
        evidence: `Action: ${event.action}, Arguments: ${JSON.stringify(
          event.arguments
        )}, Declared Intent: "${event.declaredIntent || "None"}"`,
        suggestedAction:
          "Halt execution, revoke deletion capability, or require explicit human-in-the-loop authorization.",
      };
    }

    return null;
  },
};

export const rulePrivilegeEscalation: RuntimeRule = {
  id: "WREN-RUN-002",
  name: "Privilege Escalation / Admin Role Grant",
  category: "privilege_escalation",
  defaultSeverity: "critical",
  evaluate(event: CustomerAgentEvent): RuntimeRuleViolation | null {
    const actionLower = event.action.toLowerCase();
    const argsString = JSON.stringify(event.arguments).toLowerCase();

    const isEscalationAction =
      /^(grant_admin|elevate_privilege|assign_role|modify_permissions|add_admin)/i.test(
        actionLower
      );

    const hasAdminPayload =
      /\b(role["']?\s*:\s*["']?(admin|root|superuser)|isadmin["']?\s*:\s*true)\b/i.test(
        argsString
      );

    if (isEscalationAction || hasAdminPayload) {
      return {
        ruleId: "WREN-RUN-002",
        ruleName: "Privilege Escalation / Admin Role Grant",
        severity: "critical",
        category: "privilege_escalation",
        description: `Agent attempted to elevate privileges or grant administrative rights.`,
        evidence: `Action: ${event.action}, Payload: ${JSON.stringify(
          event.arguments
        )}`,
        suggestedAction:
          "Block role mutation, isolate session, and inspect prompt history for jailbreak attempts.",
      };
    }

    return null;
  },
};

export const ruleCredentialLeak: RuntimeRule = {
  id: "WREN-RUN-003",
  name: "Active Credential / Secret in Action Arguments",
  category: "credential_leak",
  defaultSeverity: "high",
  evaluate(event: CustomerAgentEvent): RuntimeRuleViolation | null {
    const argsString = JSON.stringify(event.arguments);

    const SECRET_PATTERNS = [
      { name: "OpenAI Secret Key", regex: /sk-(?:proj-)?[A-Za-z0-9_-]{32,}/ },
      { name: "Stripe Secret Key", regex: /sk_live_[0-9a-zA-Z]{24,}/ },
      { name: "Anthropic Claude Key", regex: /sk-ant-[0-9a-zA-Z_-]{30,}/ },
      { name: "AWS Access Key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
      { name: "Bearer Token", regex: /Bearer\s+[A-Za-z0-9_\-\.]{20,}/i },
    ];

    for (const pattern of SECRET_PATTERNS) {
      const match = pattern.regex.exec(argsString);
      if (match) {

        const raw = match[0];
        const redacted =
          raw.slice(0, 7) + "..." + raw.slice(Math.max(7, raw.length - 4));

        return {
          ruleId: "WREN-RUN-003",
          ruleName: "Active Credential / Secret in Action Arguments",
          severity: "high",
          category: "credential_leak",
          description: `Exposed ${pattern.name} detected within agent tool parameters.`,
          evidence: `Discovered secret signature (${redacted}) in argument payload.`,
          suggestedAction:
            "Immediately rotate the exposed credential and sanitize agent tool inputs with environment variables.",
        };
      }
    }

    return null;
  },
};

export const rulePiiExposure: RuntimeRule = {
  id: "WREN-RUN-004",
  name: "Unmasked Financial / PII Exposure",
  category: "pii_exposure",
  defaultSeverity: "high",
  evaluate(event: CustomerAgentEvent): RuntimeRuleViolation | null {
    const argsString = JSON.stringify(event.arguments);

    if (/-----BEGIN (?:RSA )?PRIVATE KEY-----/i.test(argsString)) {
      return {
        ruleId: "WREN-RUN-004",
        ruleName: "Unmasked Financial / PII Exposure",
        severity: "high",
        category: "pii_exposure",
        description: "Raw cryptographic private key detected in tool arguments.",
        evidence: "Found '-----BEGIN PRIVATE KEY-----' header in argument payload.",
        suggestedAction:
          "Block request and redact private key material before logging or dispatch.",
      };
    }

    if (/\b\d{3}-\d{2}-\d{4}\b/.test(argsString)) {
      return {
        ruleId: "WREN-RUN-004",
        ruleName: "Unmasked Financial / PII Exposure",
        severity: "high",
        category: "pii_exposure",
        description: "Unmasked Social Security Number (SSN) detected in tool arguments.",
        evidence: "Found formatted SSN string in argument payload.",
        suggestedAction: "Enforce PII masking and DLP redaction in agent context.",
      };
    }

    return null;
  },
};

export const WREN_RUN_RULES: RuntimeRule[] = [
  ruleUnsanctionedDestructiveAction,
  rulePrivilegeEscalation,
  ruleCredentialLeak,
  rulePiiExposure,
];
