import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Returns account details - no inline session check
  return NextResponse.json({ user: "alice", balance: 1000 });
}
