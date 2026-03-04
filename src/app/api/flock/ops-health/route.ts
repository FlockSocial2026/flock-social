import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canPublish, getMyChurchMembership } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (!canPublish(membership.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const now = Date.now();
  const last24Iso = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const next24Iso = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const next72Iso = new Date(now + 72 * 60 * 60 * 1000).toISOString();

  const [{ data: latestSnapshot }, { data: dispatchLast24 }, { count: upcoming24Count }, { count: upcoming72Count }] = await Promise.all([
    admin
      .from("flock_event_rsvp_snapshots")
      .select("snapshot_at", { count: "exact" })
      .eq("church_id", membership.church_id)
      .order("snapshot_at", { ascending: false })
      .limit(1),
    admin
      .from("flock_dispatch_logs")
      .select("cadence,audience,created_at")
      .eq("church_id", membership.church_id)
      .gte("created_at", last24Iso),
    admin
      .from("church_events")
      .select("id", { count: "exact", head: true })
      .eq("church_id", membership.church_id)
      .gte("starts_at", new Date(now).toISOString())
      .lte("starts_at", next24Iso),
    admin
      .from("church_events")
      .select("id", { count: "exact", head: true })
      .eq("church_id", membership.church_id)
      .gte("starts_at", new Date(now).toISOString())
      .lte("starts_at", next72Iso),
  ]);

  const latestSnapshotAt = latestSnapshot?.[0]?.snapshot_at ?? null;
  const snapshotAgeMin = latestSnapshotAt ? Math.max(0, Math.round((now - new Date(latestSnapshotAt).getTime()) / 60000)) : null;

  const dispatchCadence = { "T-72h": 0, "T-24h": 0, "T-2h": 0 } as Record<"T-72h" | "T-24h" | "T-2h", number>;
  const dispatchAudience: Record<string, number> = {};
  for (const row of dispatchLast24 ?? []) {
    const cadence = String((row as { cadence?: string }).cadence || "") as "T-72h" | "T-24h" | "T-2h";
    if (cadence in dispatchCadence) dispatchCadence[cadence] += 1;
    const audience = String((row as { audience?: string }).audience || "unknown");
    dispatchAudience[audience] = (dispatchAudience[audience] || 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    snapshot: {
      latestAt: latestSnapshotAt,
      ageMin: snapshotAgeMin,
      healthy: snapshotAgeMin === null ? false : snapshotAgeMin <= 180,
    },
    dispatchLast24h: {
      total: (dispatchLast24 ?? []).length,
      cadence: dispatchCadence,
      audience: dispatchAudience,
    },
    upcomingEvents: {
      next24h: upcoming24Count ?? 0,
      next72h: upcoming72Count ?? 0,
    },
  });
}
