import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function delta(current: number, previous: number) {
  const diff = current - previous;
  const pct = previous > 0 ? Number(((diff / previous) * 100).toFixed(1)) : null;
  return { current, previous, diff, pct };
}

export async function GET(req: NextRequest) {
  const admin = getSupabaseAdmin();

  const sp = req.nextUrl.searchParams;
  const churchId = (sp.get("churchId") || "").trim();

  const since7 = isoDaysAgo(7);
  const since14 = isoDaysAgo(14);
  const since30 = isoDaysAgo(30);
  const since60 = isoDaysAgo(60);

  const [usersRes, postsRes, commentsRes, followsRes, eventsRes, announcementsRes, rsvpsRes, eventsPrevRes, announcementsPrevRes, rsvpsPrevRes] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("posts").select("id", { count: "exact", head: true }).gte("created_at", since30),
    admin.from("comments").select("id", { count: "exact", head: true }).gte("created_at", since30),
    admin.from("follows").select("follower_id", { count: "exact", head: true }),
    (churchId
      ? admin.from("church_events").select("id", { count: "exact", head: true }).eq("church_id", churchId).gte("created_at", since30)
      : admin.from("church_events").select("id", { count: "exact", head: true }).gte("created_at", since30)),
    (churchId
      ? admin.from("church_announcements").select("id", { count: "exact", head: true }).eq("church_id", churchId).gte("published_at", since30)
      : admin.from("church_announcements").select("id", { count: "exact", head: true }).gte("published_at", since30)),
    admin.from("event_rsvps").select("id", { count: "exact", head: true }).gte("updated_at", since7),
    (churchId
      ? admin.from("church_events").select("id", { count: "exact", head: true }).eq("church_id", churchId).gte("created_at", since60).lt("created_at", since30)
      : admin.from("church_events").select("id", { count: "exact", head: true }).gte("created_at", since60).lt("created_at", since30)),
    (churchId
      ? admin.from("church_announcements").select("id", { count: "exact", head: true }).eq("church_id", churchId).gte("published_at", since60).lt("published_at", since30)
      : admin.from("church_announcements").select("id", { count: "exact", head: true }).gte("published_at", since60).lt("published_at", since30)),
    admin.from("event_rsvps").select("id", { count: "exact", head: true }).gte("updated_at", since14).lt("updated_at", since7),
  ]);

  const errors = [usersRes, postsRes, commentsRes, followsRes, eventsRes, announcementsRes, rsvpsRes, eventsPrevRes, announcementsPrevRes, rsvpsPrevRes]
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

  const trends = {
    churchEvents30d: delta(metrics.churchEvents30d, eventsPrevRes.count ?? 0),
    churchAnnouncements30d: delta(metrics.churchAnnouncements30d, announcementsPrevRes.count ?? 0),
    eventRsvps7d: delta(metrics.eventRsvps7d, rsvpsPrevRes.count ?? 0),
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
    scope: { churchId: churchId || null },
    window: { last7Days: since7, last30Days: since30 },
    metrics,
    trends,
  });
}
