import type { CustomerAgentEvent, RuntimeRuleViolation } from "@wren/shared-types";
import type { RuntimeRule, RuntimeEvaluationResult } from "./types";
import { WREN_RUN_RULES } from "./rules";

/**
 * Evaluates a live CustomerAgentEvent against security policies in <1ms
 */
export function evaluateRuntimeAgentEvent(
  event: CustomerAgentEvent,
  customRules?: RuntimeRule[]
): RuntimeEvaluationResult {
  const rulesToEvaluate = customRules && customRules.length > 0
    ? [...customRules]
    : WREN_RUN_RULES;

  const violations: RuntimeRuleViolation[] = [];

  for (const rule of rulesToEvaluate) {
    try {
      const violation = rule.evaluate(event);
      if (violation) {
        violations.push(violation);
      }
    } catch {
      // Isolate rule failures
    }
  }

  return {
    tripped: violations.length > 0,
    violations,
    evaluatedRuleCount: rulesToEvaluate.length,
  };
}
