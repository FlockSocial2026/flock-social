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

  if (eventIds.length === 0) return NextResponse.json({ ok: true, items: [] });

  const { data: rsvps, error: rsvpErr } = await admin
    .from("event_rsvps")
    .select("event_id,status")
    .in("event_id", eventIds);

  if (rsvpErr) return NextResponse.json({ error: rsvpErr.message }, { status: 500 });

  const grouped: Record<string, { going: number; maybe: number; not_going: number; total: number }> = {};
  for (const eventId of eventIds) {
    grouped[eventId] = { going: 0, maybe: 0, not_going: 0, total: 0 };
  }

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
    };
  });

  return NextResponse.json({ ok: true, items });
}
