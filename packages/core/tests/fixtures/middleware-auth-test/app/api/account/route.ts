import { NextResponse } from "next/server";

export async function GET(request: Request) {

  return NextResponse.json({ user: "alice", balance: 1000 });
}
