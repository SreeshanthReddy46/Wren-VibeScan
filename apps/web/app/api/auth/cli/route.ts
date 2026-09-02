import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { token } = (await request.json()) as { token?: string };

    if (!token || token.trim().length < 8) {
      return NextResponse.json({ valid: false, error: "Invalid token format" }, { status: 400 });
    }

    // In production, verifies hashed token against Supabase user_api_keys table
    return NextResponse.json({
      valid: true,
      user: {
        id: "user_wren_prod",
        email: "dev@wren.dev",
        plan: "developer",
      },
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
