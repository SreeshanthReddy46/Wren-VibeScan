import * as crypto from "node:crypto";

export interface WebhookSignatureResult {
  signature: string;
  header: string;
  timestamp: number;
}

/**
 * Generate a timestamped HMAC-SHA256 signature for a webhook payload
 * Header format: t={timestamp},v1={hexSignature}
 */
export function generateWebhookSignature(
  payload: unknown,
  secret: string,
  timestamp?: number
): WebhookSignatureResult {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${payloadString}`)
    .digest("hex");

  return {
    signature,
    header: `t=${ts},v1=${signature}`,
    timestamp: ts,
  };
}

/**
 * Verify a timestamped HMAC-SHA256 webhook signature header
 * Enforces tolerance to mitigate replay attacks and uses timingSafeEqual
 */
export function verifyWebhookSignature(
  payload: unknown,
  signatureHeader: string,
  secret: string,
  toleranceSeconds: number = 300
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  // Parse header: t=1234567,v1=abc...
  const parts = signatureHeader.split(",");
  let timestampStr: string | undefined;
  let signatureHex: string | undefined;

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestampStr = value;
    if (key === "v1") signatureHex = value;
  }

  if (!timestampStr || !signatureHex) {
    return false;
  }

  const timestamp = parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  // Replay attack tolerance check
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return false;
  }

  const payloadString =
    typeof payload === "string" ? payload : JSON.stringify(payload);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payloadString}`)
    .digest("hex");

  if (expectedSignature.length !== signatureHex.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHex, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );
  } catch {
    return false;
  }
}
