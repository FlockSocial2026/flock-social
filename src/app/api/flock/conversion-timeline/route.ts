import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMyChurchMembership } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
};

type RsvpRow = {
  event_id: string;
  status: "going" | "maybe" | "not_going";
};

type SnapshotRow = {
  event_id: string;
  snapshot_at: string;
  going: number;
  maybe: number;
  not_going: number;
  total: number;
  maybe_to_going_pct: number | null;
};

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });

  const limit = Math.min(24, Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "12") || 12));
  const admin = getSupabaseAdmin();

  const { data: events, error: eventsErr } = await admin
    .from("church_events")
    .select("id,title,starts_at")
    .eq("church_id", membership.church_id)
    .order("starts_at", { ascending: false })
    .limit(limit);

  if (eventsErr) return NextResponse.json({ error: eventsErr.message }, { status: 500 });
  const eventRows = (events ?? []) as EventRow[];
  const eventIds = eventRows.map((e) => e.id);
  if (eventIds.length === 0) return NextResponse.json({ ok: true, items: [], source: "none" });

  // Preferred source: latest snapshots per event
  const { data: snapshots, error: snapshotErr } = await admin
    .from("flock_event_rsvp_snapshots")
    .select("event_id,snapshot_at,going,maybe,not_going,total,maybe_to_going_pct")
    .in("event_id", eventIds)
    .order("snapshot_at", { ascending: false })
    .limit(eventIds.length * 3);

  if (!snapshotErr && snapshots && snapshots.length > 0) {
    const latestByEvent = new Map<string, SnapshotRow>();
    for (const row of snapshots as SnapshotRow[]) {
      if (!latestByEvent.has(row.event_id)) latestByEvent.set(row.event_id, row);
    }

    const items = eventRows.map((event) => {
      const snap = latestByEvent.get(event.id);
      if (!snap) {
        return {
          event_id: event.id,
          title: event.title,
          starts_at: event.starts_at,
          going: 0,
          maybe: 0,
          not_going: 0,
          total: 0,
          maybe_to_going_pct: null,
          snapshot_at: null,
        };
      }
      return {
        event_id: event.id,
        title: event.title,
        starts_at: event.starts_at,
        going: snap.going,
        maybe: snap.maybe,
        not_going: snap.not_going,
        total: snap.total,
        maybe_to_going_pct: snap.maybe_to_going_pct,
        snapshot_at: snap.snapshot_at,
      };
    });

    return NextResponse.json({ ok: true, items, source: "snapshot" });
  }

  // Fallback: compute live from current RSVPs
  const { data: rsvps, error: rsvpErr } = await admin
    .from("event_rsvps")
    .select("event_id,status")
    .in("event_id", eventIds);

  if (rsvpErr) return NextResponse.json({ error: rsvpErr.message }, { status: 500 });

  const grouped: Record<string, { going: number; maybe: number; not_going: number; total: number }> = {};
  for (const eventId of eventIds) grouped[eventId] = { going: 0, maybe: 0, not_going: 0, total: 0 };

  for (const row of (rsvps ?? []) as RsvpRow[]) {
    const bucket = grouped[row.event_id];
    if (!bucket) continue;
    bucket[row.status] += 1;
    bucket.total += 1;
  }

  const items = eventRows.map((event) => {
    const bucket = grouped[event.id] ?? { going: 0, maybe: 0, not_going: 0, total: 0 };
    const maybeGoingBase = bucket.maybe + bucket.going;
    const maybeToGoingPct = maybeGoingBase === 0 ? null : Math.round((bucket.going / maybeGoingBase) * 100);
    return {
      event_id: event.id,
      title: event.title,
      starts_at: event.starts_at,
      ...bucket,
      maybe_to_going_pct: maybeToGoingPct,
      snapshot_at: null,
    };
  });

  return NextResponse.json({ ok: true, items, source: "live" });
}
