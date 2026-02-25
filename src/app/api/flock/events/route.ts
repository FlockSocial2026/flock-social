import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canPublish, getMyChurchMembership } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type RsvpStatus = "going" | "maybe" | "not_going";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
};

type EventRsvpRow = {
  event_id: string;
  status: RsvpStatus;
  user_id: string;
};

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ ok: true, items: [], page: 1, pageSize: 20, total: 0, hasMore: false });

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") || "20") || 20));
  const filter = String(sp.get("filter") || "all");
  const sort = String(sp.get("sort") || "soonest");

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const nowIso = new Date().toISOString();

  const admin = getSupabaseAdmin();
  let query = admin
    .from("church_events")
    .select("id,title,description,starts_at,ends_at,location", { count: "exact" })
    .eq("church_id", membership.church_id);

  if (filter === "upcoming") {
    query = query.gte("starts_at", nowIso);
  } else if (filter === "past") {
    query = query.lt("starts_at", nowIso);
  }

  query = query.order("starts_at", { ascending: sort !== "latest" }).range(from, to);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = (data ?? []) as EventRow[];
  const eventIds = events.map((event) => event.id);

  const summaryByEvent: Record<string, { going: number; maybe: number; not_going: number; total: number }> = {};
  const myRsvpByEvent: Record<string, RsvpStatus | null> = {};

  if (eventIds.length > 0) {
    const { data: rsvps, error: rsvpErr } = await admin
      .from("event_rsvps")
      .select("event_id,status,user_id")
      .in("event_id", eventIds);

    if (rsvpErr) return NextResponse.json({ error: rsvpErr.message }, { status: 500 });

    for (const eventId of eventIds) {
      summaryByEvent[eventId] = { going: 0, maybe: 0, not_going: 0, total: 0 };
      myRsvpByEvent[eventId] = null;
    }

    for (const row of (rsvps ?? []) as EventRsvpRow[]) {
      const bucket = summaryByEvent[row.event_id];
      if (!bucket) continue;
      bucket[row.status] += 1;
      bucket.total += 1;

      if (row.user_id === auth.user.id) {
        myRsvpByEvent[row.event_id] = row.status;
      }
    }
  }

  const total = count ?? 0;
  const items = events.map((event) => ({
    ...event,
    rsvp_summary: summaryByEvent[event.id] ?? { going: 0, maybe: 0, not_going: 0, total: 0 },
    my_rsvp: myRsvpByEvent[event.id] ?? null,
  }));

  return NextResponse.json({ ok: true, items, page, pageSize, total, hasMore: total > page * pageSize });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (!canPublish(membership.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await req.json();
  const title = String(body?.title || "").trim();
  const description = String(body?.description || "").trim();
  const startsAt = String(body?.startsAt || "").trim();
  const endsAt = String(body?.endsAt || "").trim();
  const location = String(body?.location || "").trim();

  if (!title || !startsAt) return NextResponse.json({ error: "title and startsAt are required" }, { status: 400 });
  if (title.length > 140) return NextResponse.json({ error: "title too long (max 140)" }, { status: 400 });
  if (description.length > 5000) return NextResponse.json({ error: "description too long (max 5000)" }, { status: 400 });
  if (location.length > 200) return NextResponse.json({ error: "location too long (max 200)" }, { status: 400 });

  const startsAtDate = new Date(startsAt);
  if (Number.isNaN(startsAtDate.getTime())) {
    return NextResponse.json({ error: "startsAt must be a valid ISO date" }, { status: 400 });
  }

  const endsAtDate = endsAt ? new Date(endsAt) : null;
  if (endsAt && (!endsAtDate || Number.isNaN(endsAtDate.getTime()))) {
    return NextResponse.json({ error: "endsAt must be a valid ISO date" }, { status: 400 });
  }
  if (endsAtDate && endsAtDate.getTime() < startsAtDate.getTime()) {
    return NextResponse.json({ error: "endsAt must be after startsAt" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: latestEvent, error: latestErr } = await admin
    .from("church_events")
    .select("created_at")
    .eq("church_id", membership.church_id)
    .eq("author_user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) return NextResponse.json({ error: latestErr.message }, { status: 500 });

  if (latestEvent?.created_at) {
    const msSinceLast = Date.now() - new Date(latestEvent.created_at).getTime();
    if (msSinceLast < 30_000) {
      return NextResponse.json({ error: "Event create cooldown: wait 30 seconds." }, { status: 429 });
    }
  }

  const { data, error } = await admin
    .from("church_events")
    .insert({
      church_id: membership.church_id,
      author_user_id: auth.user.id,
      title,
      description: description || null,
      starts_at: startsAtDate.toISOString(),
      ends_at: endsAtDate ? endsAtDate.toISOString() : null,
      location: location || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
