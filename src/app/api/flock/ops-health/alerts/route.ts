import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canPublish, getMyChurchMembership } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Alert = { level: "info" | "warning" | "critical"; key: string; message: string; action: string };

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (!canPublish(membership.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const in24Iso = new Date(now + 24 * 60 * 60 * 1000).toISOString();
  const in72Iso = new Date(now + 72 * 60 * 60 * 1000).toISOString();
  const last24Iso = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: latestSnapshot }, { data: dispatchRows }, { count: upcoming24 }, { count: upcoming72 }] = await Promise.all([
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
      .gte("starts_at", nowIso)
      .lte("starts_at", in24Iso),
    admin
      .from("church_events")
      .select("id", { count: "exact", head: true })
      .eq("church_id", membership.church_id)
      .gte("starts_at", nowIso)
      .lte("starts_at", in72Iso),
  ]);

  const alerts: Alert[] = [];

  const latestAt = latestSnapshot?.[0]?.snapshot_at ?? null;
  const ageMin = latestAt ? Math.max(0, Math.round((now - new Date(latestAt).getTime()) / 60000)) : null;

  if (ageMin === null) {
    alerts.push({
      level: "critical",
      key: "snapshot_missing",
      message: "No attendance snapshots found for this church.",
      action: "Run attendance snapshot cron and verify snapshot writes.",
    });
  } else if (ageMin > 180) {
    alerts.push({
      level: "warning",
      key: "snapshot_stale",
      message: `Latest snapshot is ${ageMin} minutes old.`,
      action: "Trigger snapshot cron and inspect ingest timing.",
    });
  }

  const cadenceCounts = { "T-72h": 0, "T-24h": 0, "T-2h": 0 } as Record<"T-72h" | "T-24h" | "T-2h", number>;
  for (const row of dispatchRows ?? []) {
    const cadence = String((row as { cadence?: string }).cadence || "") as "T-72h" | "T-24h" | "T-2h";
    if (cadence in cadenceCounts) cadenceCounts[cadence] += 1;
  }

  if ((upcoming24 ?? 0) > 0 && cadenceCounts["T-24h"] === 0) {
    alerts.push({
      level: "critical",
      key: "missing_t24_dispatch",
      message: "Upcoming events in next 24h but no T-24h dispatch logged in last 24h.",
      action: "Run reminder cron T-24h and validate dispatch inserts.",
    });
  }

  if ((upcoming72 ?? 0) > 0 && cadenceCounts["T-72h"] === 0) {
    alerts.push({
      level: "warning",
      key: "missing_t72_dispatch",
      message: "Upcoming events in next 72h but no T-72h dispatch logged in last 24h.",
      action: "Check T-72h reminder cadence and verify logs.",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      level: "info",
      key: "ops_healthy",
      message: "No immediate ops-health alerts detected.",
      action: "Continue normal monitoring cadence.",
    });
  }

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    snapshotAgeMin: ageMin,
    upcoming: { next24h: upcoming24 ?? 0, next72h: upcoming72 ?? 0 },
    dispatchCadence: cadenceCounts,
    alerts,
  });
}
