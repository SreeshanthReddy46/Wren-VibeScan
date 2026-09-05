import { inngest } from "../client.ts";
import { evaluateRuntimeAgentEvent } from "@wren/core";
import {
  ingestCustomerAgentEvent,
  getRuntimeWebhookConfig,
} from "../../lib/runtime-dispatcher.ts";

export const executeRuntimeAuditFunction = inngest.createFunction(
  {
    id: "execute-runtime-audit",
    name: "Evaluate Customer Agent Event Threat Policies",
    triggers: [{ event: "agent.action.logged" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const agentEvent = event.data;

    const evalResult = await step.run("evaluate-threat-rules", async () => {
      return evaluateRuntimeAgentEvent(agentEvent);
    });

    if (evalResult.tripped) {
      await step.run("dispatch-security-webhook", async () => {
        const config = await getRuntimeWebhookConfig();
        return {
          tripped: true,
          violationsCount: evalResult.violations.length,
          webhookConfigured: Boolean(config.url),
        };
      });
    }

    return {
      eventId: agentEvent.id || agentEvent.eventId,
      tripped: evalResult.tripped,
      violationsCount: evalResult.violations.length,
    };
  }
);
