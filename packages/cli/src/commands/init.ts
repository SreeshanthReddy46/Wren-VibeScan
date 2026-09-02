import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger";
import pc from "picocolors";

const DEFAULT_WRENIGNORE = `# Wren Scanner Ignore List
# Dependencies & Build artifacts
node_modules/
.next/
dist/
build/
coverage/

# Test fixtures with intentional mock secrets
fixtures/
__mocks__/
*.mock.ts
*.test.ts
`;

const DEFAULT_WRENRC = {
  $schema: "https://wren.dev/schema.json",
  version: 1,
  failOn: "critical",
  ignoreRules: [],
  ignorePaths: ["fixtures/**", "**/*.mock.*"],
};

export function runInitCommand(): void {
  const cwd = process.cwd();
  const ignorePath = path.join(cwd, ".wrenignore");
  const configPath = path.join(cwd, ".wrenrc.json");

  let createdCount = 0;

  if (!fs.existsSync(ignorePath)) {
    fs.writeFileSync(ignorePath, DEFAULT_WRENIGNORE, "utf8");
    logger.success(`Created ${pc.cyan(".wrenignore")}`);
    createdCount++;
  } else {
    logger.info(".wrenignore already exists, skipping.");
  }

  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_WRENRC, null, 2), "utf8");
    logger.success(`Created ${pc.cyan(".wrenrc.json")}`);
    createdCount++;
  } else {
    logger.info(".wrenrc.json already exists, skipping.");
  }

  if (createdCount > 0) {
    console.log(pc.green("\n🦅 Wren initialized successfully! Run 'wren check' to start scanning."));
  }
}
