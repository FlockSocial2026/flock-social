import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const enabled = process.env.PRAYER_LEADERBOARD_ENABLED === "true";
  if (!enabled) {
    return NextResponse.json(
      { ok: false, error: "Prayer leaderboard is disabled pending anti-gaming controls." },
      { status: 503 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("prayer_leaderboard_scores")
    .select("user_id,score,last_score_at")
    .order("score", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}
