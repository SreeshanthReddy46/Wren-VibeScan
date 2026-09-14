import * as os from "os";
import * as crypto from "crypto";
import { loadUserConfig } from "../auth/token-storage";

export interface SentryDsnParts {
  host: string;
  projectId: string;
  publicKey: string;
}

export function parseDsn(dsn: string): SentryDsnParts | null {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const pathParts = url.pathname.split("/").filter(Boolean);
    const projectId = pathParts[pathParts.length - 1];

    if (!publicKey || !host || !projectId) {
      return null;
    }

    return { host, projectId, publicKey };
  } catch {
    return null;
  }
}

export function isTelemetryEnabled(): boolean {
  if (
    process.env.DO_NOT_TRACK === "1" ||
    process.env.WREN_TELEMETRY === "0" ||
    process.env.WREN_TELEMETRY === "false"
  ) {
    return false;
  }

  try {
    const config = loadUserConfig();
    if (config.telemetryEnabled === false) {
      return false;
    }
  } catch {
    return true;
  }

  return true;
}

export function sanitizeArg(arg: string): string {
  if (arg.startsWith("--api-key=") || arg.startsWith("-k=")) {
    return "--api-key=[REDACTED]";
  }
  if (arg.startsWith("sk-") || arg.startsWith("wren_") || arg.startsWith("ant-")) {
    return "[REDACTED]";
  }
  return arg;
}

export function buildSentryPayload(
  error: unknown,
  cliVersion: string = "2.1.0",
  extra: Record<string, unknown> = {}
) {
  const eventId = crypto.randomBytes(16).toString("hex");
  const err = error instanceof Error ? error : new Error(String(error));

  const sanitizedArgs = (process.argv || []).slice(2).map(sanitizeArg);

  return {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    logger: "wren-cli",
    release: cliVersion,
    environment: process.env.NODE_ENV || "production",
    exception: {
      values: [
        {
          type: err.name || "Error",
          value: err.message || "Unknown error",
          stacktrace: err.stack
            ? {
                frames: err.stack
                  .split("\n")
                  .slice(1)
                  .map((line) => ({
                    function: line.trim(),
                  })),
              }
            : undefined,
        },
      ],
    },
    tags: {
      os: process.platform,
      os_release: os.release(),
      arch: process.arch,
      node_version: process.version,
    },
    extra: {
      argv: sanitizedArgs,
      uptime: process.uptime(),
      ...extra,
    },
  };
}

export function reportCrash(
  error: unknown,
  extra: Record<string, unknown> = {}
): void {
  if (!isTelemetryEnabled()) {
    return;
  }

  const dsn = process.env.SENTRY_DSN || process.env.WREN_SENTRY_DSN;
  if (!dsn) {
    return;
  }

  const parsed = parseDsn(dsn);
  if (!parsed) {
    return;
  }

  let cliVersion = "2.1.0";
  try {
    cliVersion = require("../../package.json").version || cliVersion;
  } catch {}

  const payload = buildSentryPayload(error, cliVersion, extra);
  const endpoint = `https://${parsed.host}/api/${parsed.projectId}/store/`;
  const authHeader = `Sentry sentry_version=7, sentry_client=wren-cli/${cliVersion}, sentry_key=${parsed.publicKey}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": authHeader,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(() => {})
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeoutId);
      });
  } catch {}
}
