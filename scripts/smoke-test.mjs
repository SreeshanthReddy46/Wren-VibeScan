import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

console.log("🦅 Running pre-publish smoke test for CLI...");

const rootDir = process.cwd();
const cliPkgDir = path.join(rootDir, "packages", "cli");

// 1. Pack the package
console.log("1. Running 'npm pack' in packages/cli...");
const packOutput = execSync("npm pack --json", { cwd: cliPkgDir, encoding: "utf8" });
const packInfo = JSON.parse(packOutput)[0];
const tarballName = packInfo.filename;
const tarballPath = path.join(cliPkgDir, tarballName);

console.log(`   Created tarball: ${tarballName}`);

// 2. Create an isolated temporary directory
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wren-smoke-test-"));
console.log(`2. Testing install in isolated temp dir: ${tempDir}`);

try {
  fs.writeFileSync(path.join(tempDir, "package.json"), JSON.stringify({ name: "smoke-test", private: true }));
  execSync(`npm install "${tarballPath}"`, { cwd: tempDir, stdio: "pipe" });

  // 3. Execute the binary
  const binaryPath = path.join(tempDir, "node_modules", ".bin", process.platform === "win32" ? "wren.cmd" : "wren");
  console.log("3. Executing installed binary 'wren --version'...");
  const versionOutput = execSync(`"${binaryPath}" --version`, { encoding: "utf8" }).trim();

  console.log(`   Binary responded with version: ${versionOutput}`);

  if (versionOutput.includes("1.0.0")) {
    console.log("✔ Smoke test passed! CLI binary is verified and ready for npm publish.");
  } else {
    throw new Error(`Unexpected version output: ${versionOutput}`);
  }
} finally {
  // Clean up tarball and temp directory
  try {
    if (fs.existsSync(tarballPath)) fs.unlinkSync(tarballPath);
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
