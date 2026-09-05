import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

function checkRateLimit(ip: string): { allowed: boolean; remainingSec: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remainingSec: Math.ceil(WINDOW_MS / 1000) };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const remainingSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return { allowed: false, remainingSec };
  }

  record.count += 1;
  return { allowed: true, remainingSec: Math.ceil((record.resetTime - now) / 1000) };
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const ip = getClientIp(request);

  const { allowed, remainingSec } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      {
        error: `Too many login attempts. Account locked for security. Please try again in ${remainingSec} seconds.`,
        retryAfter: remainingSec,
      },
      {
        status: 429,
        headers: { "Retry-After": remainingSec.toString() },
      }
    );
  }

  try {
    const body = await request.json();
    const { identifier, password, rememberMe } = body as {
      identifier?: string;
      password?: string;
      rememberMe?: boolean;
    };

    if (!identifier || typeof identifier !== "string" || !password || typeof password !== "string") {
      await enforceTimingFloor(startTime);
      return NextResponse.json(
        { error: "Invalid email, username, or password." },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    if (cleanIdentifier.length < 3 || cleanIdentifier.length > 100 || password.length < 8 || password.length > 128) {
      await enforceTimingFloor(startTime);
      return NextResponse.json(
        { error: "Invalid email, username, or password." },
        { status: 400 }
      );
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier);
    const isUsername = /^[a-zA-Z0-9_.-]{3,30}$/.test(cleanIdentifier);

    if (!isEmail && !isUsername) {
      await enforceTimingFloor(startTime);
      return NextResponse.json(
        { error: "Please enter a valid email (e.g. user@gmail.com) or username." },
        { status: 400 }
      );
    }

    await enforceTimingFloor(startTime);

    const sessionToken = `wren_sess_${Buffer.from(`${cleanIdentifier}:${Date.now()}`).toString("base64url")}`;
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

    const response = NextResponse.json(
      {
        success: true,
        user: {
          identifier: cleanIdentifier,
          isEmail,
          isGmail: cleanIdentifier.endsWith("@gmail.com"),
          authenticatedAt: new Date().toISOString(),
        },
      },
      { status: 200 }
    );

    response.cookies.set("wren_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge,
    });

    return response;
  } catch {
    await enforceTimingFloor(startTime);
    return NextResponse.json(
      { error: "Invalid email, username, or password." },
      { status: 400 }
    );
  }
}

async function enforceTimingFloor(startTime: number, targetMs = 250): Promise<void> {
  const elapsed = Date.now() - startTime;
  if (elapsed < targetMs) {
    await new Promise((resolve) => setTimeout(resolve, targetMs - elapsed));
  }
}
