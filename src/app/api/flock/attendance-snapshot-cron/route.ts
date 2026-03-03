import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createCronRunMeta, requireCronSecret } from "@/lib/cron";

type EventRow = { id: string; church_id: string };
type RsvpRow = { event_id: string; status: "going" | "maybe" | "not_going" };

export async function GET(req: NextRequest) {
  const startedAtMs = Date.now();

  try {
    const auth = requireCronSecret(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error, ...createCronRunMeta(startedAtMs) }, { status: auth.status });
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

    if (eventsErr) {
      return NextResponse.json({ ok: false, error: eventsErr.message, stage: "load_events", ...createCronRunMeta(startedAtMs) }, { status: 500 });
    }

    const eventRows = (events ?? []) as EventRow[];
    if (eventRows.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, scanned: 0, sinceHours, ...createCronRunMeta(startedAtMs) });
    }

    const eventIds = eventRows.map((e) => e.id);

    const { data: rsvps, error: rsvpErr } = await admin
      .from("event_rsvps")
      .select("event_id,status")
      .in("event_id", eventIds);

    if (rsvpErr) {
      return NextResponse.json({ ok: false, error: rsvpErr.message, stage: "load_rsvps", ...createCronRunMeta(startedAtMs) }, { status: 500 });
    }

    const grouped: Record<string, { going: number; maybe: number; not_going: number; total: number }> = {};
    for (const eventId of eventIds) grouped[eventId] = { going: 0, maybe: 0, not_going: 0, total: 0 };

    let ignoredRsvpRows = 0;
    for (const row of (rsvps ?? []) as RsvpRow[]) {
      const bucket = grouped[row.event_id];
      if (!bucket) {
        ignoredRsvpRows += 1;
        continue;
      }
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
    if (insertErr) {
      return NextResponse.json({ ok: false, error: insertErr.message, stage: "insert_snapshots", ...createCronRunMeta(startedAtMs) }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      inserted: inserts.length,
      scanned: eventRows.length,
      sinceHours,
      ignoredRsvpRows,
      ...createCronRunMeta(startedAtMs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown runtime error";
    return NextResponse.json({ ok: false, error: message, stage: "runtime", ...createCronRunMeta(startedAtMs) }, { status: 500 });
  }
}
