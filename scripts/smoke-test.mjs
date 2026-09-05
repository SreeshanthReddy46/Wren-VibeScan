import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

console.log("🦅 Running pre-publish smoke test for CLI...");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const cliPkgDir = path.join(rootDir, "packages", "cli");

console.log("1. Running 'pnpm pack' in packages/cli...");
const packOutput = execSync("pnpm pack", {
  cwd: cliPkgDir,
  encoding: "utf8",
  shell: true,
});
console.log(packOutput.trim());

const possibleTarballs = [
  "wren-security-1.0.0.tgz",
  "wren-cli-1.0.0.tgz",
  "wren-1.0.0.tgz",
];

let tarballPath = null;
for (const name of possibleTarballs) {
  const p1 = path.join(rootDir, name);
  const p2 = path.join(cliPkgDir, name);
  if (fs.existsSync(p1)) {
    tarballPath = p1;
    break;
  }
  if (fs.existsSync(p2)) {
    tarballPath = p2;
    break;
  }
}

if (!tarballPath || !fs.existsSync(tarballPath)) {
  throw new Error(`Tarball not found after pack in ${cliPkgDir}`);
}
console.log(`2. Successfully created release tarball: ${tarballPath}`);

console.log("3. Executing CLI binary '--version'...");
const versionOutput = execSync(`node "${path.join(cliPkgDir, "dist", "cli.js")}" --version`, {
  encoding: "utf8",
}).trim();
console.log(`   Binary responded with version: ${versionOutput}`);

console.log("4. Executing CLI binary '--help'...");
const helpOutput = execSync(`node "${path.join(cliPkgDir, "dist", "cli.js")}" --help`, {
  encoding: "utf8",
}).trim();

if (versionOutput.includes("1.0.0") && (helpOutput.includes("wren-security [path]") || helpOutput.includes("wren-cli [path]") || helpOutput.includes("wren [path]"))) {
  console.log("✔ Smoke test passed! CLI binary is verified and ready for npm publish.");
} else {
  throw new Error(`Unexpected smoke test output:\n${helpOutput}`);
}

try {
  if (fs.existsSync(tarballPath)) fs.unlinkSync(tarballPath);
} catch {

}
