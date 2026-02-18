import { NextRequest, NextResponse } from "next/server";
import { getModerationSummary } from "@/lib/moderationSummary";
import { sendModerationAlert } from "@/lib/moderationAlerts";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  const cronSecret = process.env.CRON_SECRET || process.env.MODERATION_CRON_SECRET;
  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const summary = await getModerationSummary({
    windowHours: Number(sp.get("windowHours") || 24),
    openWarn: Number(sp.get("openWarn") || 25),
    newWarn: Number(sp.get("newWarn") || 15),
    userWarn: Number(sp.get("userWarn") || 5),
  });

  const hasAlert = Object.values(summary.alerts).some(Boolean);
  let delivery: { delivered: boolean; reason: string } = { delivered: false, reason: "No alert triggered" };

  if (hasAlert) {
    delivery = await sendModerationAlert(summary);
  }

  console.log("[moderation-summary-cron]", { hasAlert, delivery, summary });

  return NextResponse.json({ ok: true, hasAlert, delivery, summary });
}
