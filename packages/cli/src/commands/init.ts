import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger";
import pc from "picocolors";

const DEFAULT_IGNORE_STORE = {
  version: "1.0.0",
  ignores: [
    {
      id: "ign-fixtures",
      ruleId: "*",
      filePath: "fixtures/**",
      reason: "Test fixture mock code",
      ignoredAt: new Date().toISOString(),
    },
    {
      id: "ign-mocks",
      ruleId: "*",
      filePath: "__mocks__/**",
      reason: "Mock utilities",
      ignoredAt: new Date().toISOString(),
    },
  ],
};

const DEFAULT_WRENRC = {
  $schema: "https://wren.dev/schema.json",
  version: "3.0.0",
  failOn: "critical",
  ignoreRules: [],
  ignorePaths: ["fixtures/**", "**/*.mock.*"],
};

export function runInitCommand(): void {
  const cwd = process.cwd();
  const wrenDir = path.join(cwd, ".wren");
  const ignorePath = path.join(wrenDir, "ignore.json");
  const configPath = path.join(wrenDir, "config.json");

  let createdCount = 0;

  try {
    if (!fs.existsSync(wrenDir)) {
      fs.mkdirSync(wrenDir, { recursive: true });
    }

    if (!fs.existsSync(ignorePath)) {
      fs.writeFileSync(
        ignorePath,
        JSON.stringify(DEFAULT_IGNORE_STORE, null, 2),
        "utf8"
      );
      logger.success(`Created ${pc.cyan(".wren/ignore.json")}`);
      createdCount++;
    } else {
      logger.info(".wren/ignore.json already exists, skipping.");
    }

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(
        configPath,
        JSON.stringify(DEFAULT_WRENRC, null, 2),
        "utf8"
      );
      logger.success(`Created ${pc.cyan(".wren/config.json")}`);
      createdCount++;
    } else {
      logger.info(".wren/config.json already exists, skipping.");
    }
  } catch (err: any) {
    if (err?.code === "EACCES" || err?.code === "EPERM") {
      logger.error(
        "Permission denied: Unable to create initialization files in current directory."
      );
    } else {
      logger.error(
        `Failed to initialize configuration: ${
          err?.message || String(err)
        }`
      );
    }
    return;
  }

  if (createdCount > 0) {
    console.log(
      pc.green(
        "\n🦅 Wren initialized successfully! Run 'wren-security check' to start scanning."
      )
    );
  }
}
