import { loadUserConfig } from "../auth/token-storage";

export function reportCrash(error: unknown): void {
  const config = loadUserConfig();
  // Respect user opt-out or DO_NOT_TRACK
  if (config.telemetryEnabled === false || process.env.DO_NOT_TRACK === "1") {
    return;
  }

  // Sentry / error capture hook for production CLI
  if (process.env.SENTRY_DSN) {
    try {
      // If Sentry SDK is configured
    } catch {
      // Ignore background telemetry errors
    }
  }
}
