export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSec: number;
}

export type RateLimitTier = "llm" | "general";

const TIER_CONFIGS: Record<RateLimitTier, { maxRequests: number; windowMs: number }> = {
  llm: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
  general: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
};

const clientRequestTimestamps = new Map<string, number[]>();

export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  const auth = request.headers.get("authorization");
  if (auth) {
    return `auth:${auth.trim().slice(-16)}`;
  }
  return "anonymous-client";
}

export function checkRateLimit(
  identifier: string,
  tier: RateLimitTier = "general",
  customConfig?: { maxRequests: number; windowMs: number }
): RateLimitResult {
  const config = customConfig || TIER_CONFIGS[tier];
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `${tier}:${identifier}`;

  const timestamps = clientRequestTimestamps.get(key) || [];
  const validTimestamps = timestamps.filter((ts) => ts > windowStart);

  if (validTimestamps.length >= config.maxRequests) {
    const oldest = validTimestamps[0];
    const resetMs = Math.max(0, oldest + config.windowMs - now);
    const retryAfterSec = Math.max(1, Math.ceil(resetMs / 1000));
    clientRequestTimestamps.set(key, validTimestamps);
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetMs,
      retryAfterSec,
    };
  }

  validTimestamps.push(now);
  clientRequestTimestamps.set(key, validTimestamps);

  const remaining = Math.max(0, config.maxRequests - validTimestamps.length);
  return {
    allowed: true,
    limit: config.maxRequests,
    remaining,
    resetMs: config.windowMs,
    retryAfterSec: 0,
  };
}

export function clearRateLimitsForTesting(): void {
  clientRequestTimestamps.clear();
}
