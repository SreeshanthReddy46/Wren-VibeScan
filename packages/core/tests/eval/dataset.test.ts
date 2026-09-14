import test from "node:test";
import assert from "node:assert/strict";
import { GROUND_TRUTH_DATASET } from "../../dist/index.js";

test("GROUND_TRUTH_DATASET contains exactly 100 labeled samples", () => {
  assert.equal(GROUND_TRUTH_DATASET.length, 100);
});

test("GROUND_TRUTH_DATASET is balanced: exactly 50 vulnerable and 50 clean", () => {
  const vulnerable = GROUND_TRUTH_DATASET.filter((s) => s.expectedVulnerable);
  const clean = GROUND_TRUTH_DATASET.filter((s) => !s.expectedVulnerable);
  assert.equal(vulnerable.length, 50);
  assert.equal(clean.length, 50);
});

test("GROUND_TRUTH_DATASET snippets have unique IDs and non-empty code", () => {
  const ids = new Set<string>();
  for (const snippet of GROUND_TRUTH_DATASET) {
    assert.ok(!ids.has(snippet.id), `Duplicate ID found: ${snippet.id}`);
    ids.add(snippet.id);
    assert.ok(snippet.name.length > 0);
    assert.ok(snippet.code.length > 0);
    assert.ok(snippet.fileName.length > 0);
    assert.ok(["secret", "auth", "database", "configuration", "dependency"].includes(snippet.category));

    if (snippet.expectedVulnerable) {
      assert.ok(snippet.expectedRuleId, `Vulnerable snippet ${snippet.id} missing expectedRuleId`);
    }
  }
});
