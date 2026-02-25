import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type EventRow = { id: string; church_id: string };
type RsvpRow = { event_id: string; status: "going" | "maybe" | "not_going" };

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const sinceHours = Math.max(24, Number(req.nextUrl.searchParams.get("sinceHours") || 336));
    const sinceIso = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString();

    const { data: events, error: eventsErr } = await admin
      .from("church_events")
      .select("id,church_id")
      .gte("starts_at", sinceIso)
      .order("starts_at", { ascending: false })
      .limit(500);

    if (eventsErr) return NextResponse.json({ error: eventsErr.message }, { status: 500 });

    const eventRows = (events ?? []) as EventRow[];
    if (eventRows.length === 0) return NextResponse.json({ ok: true, inserted: 0, scanned: 0 });

    const eventIds = eventRows.map((e) => e.id);

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

    const snapshotAt = new Date().toISOString();
    const inserts = eventRows.map((event) => {
      const bucket = grouped[event.id] ?? { going: 0, maybe: 0, not_going: 0, total: 0 };
      const maybeBase = bucket.going + bucket.maybe;
      return {
        church_id: event.church_id,
        event_id: event.id,
        snapshot_at: snapshotAt,
        going: bucket.going,
        maybe: bucket.maybe,
        not_going: bucket.not_going,
        total: bucket.total,
        maybe_to_going_pct: maybeBase === 0 ? null : Math.round((bucket.going / maybeBase) * 100),
      };
    });

    const { error: insertErr } = await admin.from("flock_event_rsvp_snapshots").insert(inserts);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, inserted: inserts.length, scanned: eventRows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown runtime error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
