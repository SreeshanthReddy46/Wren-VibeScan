import { NextResponse } from "next/server";
import type { HealthCheckResponse } from "@wren/shared-types";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasRedis = !!process.env.UPSTASH_REDIS_REST_URL;

  const health: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    services: {
      database: hasSupabase ? "connected" : "mock",
      cache: hasRedis ? "connected" : "mock",
    },
  };

  return NextResponse.json(health, { status: 200 });
}
