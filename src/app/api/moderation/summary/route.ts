import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/moderationAuth";
import { getModerationSummary } from "@/lib/moderationSummary";

export async function GET(req: NextRequest) {
  const auth = await requireModerator(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const sp = req.nextUrl.searchParams;

  const summary = await getModerationSummary({
    windowHours: Number(sp.get("windowHours") || 24),
    openWarn: Number(sp.get("openWarn") || 25),
    newWarn: Number(sp.get("newWarn") || 15),
    userWarn: Number(sp.get("userWarn") || 5),
  });

  return NextResponse.json({ ok: true, summary });
}
