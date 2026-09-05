import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { AgentTracer } from "../../dist/index.js";

test("AgentTracer records spans with input, output, reasoning, duration, and rubric", () => {
  const tracer = new AgentTracer("scan-test-1");

  const span = tracer.startSpan("verifier", "finding-1", { hypothesis: "auth missing" });
  tracer.finishSpan(span, { verdict: "CONFIRMED" }, "Verified no middleware", 0.92);

  const traces = tracer.getTraces();
  assert.equal(traces.length, 1);
  assert.equal(traces[0].step, "verifier");
  assert.equal(traces[0].findingId, "finding-1");
  assert.equal(traces[0].confidenceScore, 0.92);
  assert.ok(traces[0].durationMs >= 0);
});

test("AgentTracer flushes traces to local disk file", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-trace-test-"));
  const tracer = new AgentTracer("scan-disk-1");

  const span = tracer.startSpan("planner", undefined, { findingsCount: 3 });
  tracer.finishSpan(span, { queueSize: 1 }, "Triaged 1 finding");

  const tracePath = tracer.flushToDisk(tmpDir);
  assert.ok(fs.existsSync(tracePath));

  const saved = JSON.parse(fs.readFileSync(tracePath, "utf-8"));
  assert.equal(saved.scanId, "scan-disk-1");
  assert.equal(saved.traces.length, 1);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
