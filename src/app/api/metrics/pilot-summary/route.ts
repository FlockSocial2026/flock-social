import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function GET(req: NextRequest) {
  const admin = getSupabaseAdmin();

  const since7 = isoDaysAgo(7);
  const since30 = isoDaysAgo(30);

  const [usersRes, postsRes, commentsRes, followsRes, eventsRes, announcementsRes, rsvpsRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("posts").select("id", { count: "exact", head: true }).gte("created_at", since30),
    admin.from("comments").select("id", { count: "exact", head: true }).gte("created_at", since30),
    admin.from("follows").select("follower_id", { count: "exact", head: true }),
    admin.from("church_events").select("id", { count: "exact", head: true }).gte("created_at", since30),
    admin.from("church_announcements").select("id", { count: "exact", head: true }).gte("published_at", since30),
    admin.from("event_rsvps").select("id", { count: "exact", head: true }).gte("updated_at", since7),
  ]);

  const errors = [usersRes, postsRes, commentsRes, followsRes, eventsRes, announcementsRes, rsvpsRes]
    .map((r) => r.error?.message)
    .filter(Boolean);

  if (errors.length) {
    return NextResponse.json({ ok: false, errors }, { status: 500 });
  }

  const metrics = {
    profilesTotal: usersRes.count ?? 0,
    posts30d: postsRes.count ?? 0,
    comments30d: commentsRes.count ?? 0,
    followEdgesTotal: followsRes.count ?? 0,
    churchEvents30d: eventsRes.count ?? 0,
    churchAnnouncements30d: announcementsRes.count ?? 0,
    eventRsvps7d: rsvpsRes.count ?? 0,
  };

  const format = req.nextUrl.searchParams.get("format") || "json";
  if (format === "csv") {
    const lines = ["metric,value", ...Object.entries(metrics).map(([k, v]) => `${k},${v}`)];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=pilot-summary-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    window: { last7Days: since7, last30Days: since30 },
    metrics,
  });
}
