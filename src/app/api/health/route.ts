import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "flock-social",
    now: new Date().toISOString(),
    runtime: "nextjs",
  });
}
