import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runScan } from "../../dist/index.js";
import type { ScanProgressEvent } from "@wren/shared-types";

test("runScan emits lifecycle progress events when onProgress is provided", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-progress-test-"));
  const sampleFile = path.join(tempDir, "service.ts");
  fs.writeFileSync(
    sampleFile,
    "export const apiKey = 'sk-proj-1234567890123456789012345678901234567890';",
    "utf8"
  );

  const capturedEvents: ScanProgressEvent[] = [];

  try {
    const result = await runScan({
      targetPath: tempDir,
      enableLlmReasoning: false,
      onProgress: (event) => {
        capturedEvents.push(event);
      },
    });

    assert.ok(result.findings.length > 0);
    const stages = capturedEvents.map((e) => e.stage);
    assert.ok(stages.includes("discovery_start"));
    assert.ok(stages.includes("discovery_complete"));
    assert.ok(stages.includes("scan_file"));
    assert.ok(stages.includes("static_complete"));

    const discComplete = capturedEvents.find(
      (e) => e.stage === "discovery_complete"
    ) as any;
    assert.strictEqual(discComplete.fileCount, 1);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
