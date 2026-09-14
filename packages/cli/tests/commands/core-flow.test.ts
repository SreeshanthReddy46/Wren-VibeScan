import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  runCheckCommand,
  saveUserConfig,
  loadUserConfig,
  ExitCode,
} from "../../dist/index.js";

test("Core Loop: authentication configuration -> scan execution -> report export", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-core-flow-"));
  const jsonReportPath = path.join(tempDir, "report.json");
  const sarifReportPath = path.join(tempDir, "report.sarif");

  try {
    saveUserConfig({
      apiKey: "wren_test_token_12345",
      apiUrl: "https://api.wren.dev",
      telemetryEnabled: false,
    });

    const loadedConfig = loadUserConfig();
    assert.strictEqual(loadedConfig.apiKey, "wren_test_token_12345");
    assert.strictEqual(loadedConfig.apiUrl, "https://api.wren.dev");

    const srcDir = path.join(tempDir, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, "auth.ts"),
      "export function isAuthenticated(req: any): boolean {\n  return req.headers.authorization !== undefined;\n}\n"
    );

    const terminalExitCode = await runCheckCommand(tempDir, {
      format: "terminal",
    });
    assert.strictEqual(terminalExitCode, ExitCode.SUCCESS);

    const jsonExitCode = await runCheckCommand(tempDir, {
      format: "json",
      output: jsonReportPath,
    });
    assert.strictEqual(jsonExitCode, ExitCode.SUCCESS);
    assert.ok(fs.existsSync(jsonReportPath));

    const jsonContent = JSON.parse(fs.readFileSync(jsonReportPath, "utf-8"));
    assert.ok(jsonContent.scanId);
    assert.strictEqual(typeof jsonContent.summary.totalFindings, "number");
    assert.strictEqual(jsonContent.summary.filesScanned, 1);

    const sarifExitCode = await runCheckCommand(tempDir, {
      format: "sarif",
      output: sarifReportPath,
    });
    assert.strictEqual(sarifExitCode, ExitCode.SUCCESS);
    assert.ok(fs.existsSync(sarifReportPath));

    const sarifContent = JSON.parse(fs.readFileSync(sarifReportPath, "utf-8"));
    assert.strictEqual(sarifContent.version, "2.1.0");
    assert.ok(Array.isArray(sarifContent.runs));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
