import type { CustomerAgentEvent, RuntimeRuleViolation } from "@wren/shared-types";

export interface RuntimeRule {
  id: string;
  name: string;
  category: RuntimeRuleViolation["category"];
  defaultSeverity: RuntimeRuleViolation["severity"];
  evaluate: (event: CustomerAgentEvent) => RuntimeRuleViolation | null;
}

export interface RuntimeEvaluationResult {
  tripped: boolean;
  violations: RuntimeRuleViolation[];
  evaluatedRuleCount: number;
}
