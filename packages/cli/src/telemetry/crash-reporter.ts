import { loadUserConfig } from "../auth/token-storage";

export function reportCrash(error: unknown): void {
  const config = loadUserConfig();

  if (config.telemetryEnabled === false || process.env.DO_NOT_TRACK === "1") {
    return;
  }

  if (process.env.SENTRY_DSN) {
    try {

    } catch {

    }
  }
}
