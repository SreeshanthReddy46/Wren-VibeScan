import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { WrenUserConfig } from "@wren/shared-types";

function getConfigDir(): string {
  if (process.env.XDG_CONFIG_HOME) {
    return path.join(process.env.XDG_CONFIG_HOME, "wren");
  }
  return path.join(os.homedir(), ".wren");
}

function getConfigFilePath(): string {
  return path.join(getConfigDir(), "config.json");
}

export function loadUserConfig(): WrenUserConfig {
  const filePath = getConfigFilePath();
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveUserConfig(config: WrenUserConfig): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  const current = loadUserConfig();
  const updated = { ...current, ...config };
  fs.writeFileSync(getConfigFilePath(), JSON.stringify(updated, null, 2), {
    mode: 0o600,
  });
}

export function clearUserConfig(): void {
  const filePath = getConfigFilePath();
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Ignore
    }
  }
}
