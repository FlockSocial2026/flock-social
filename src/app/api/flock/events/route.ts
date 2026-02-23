import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canPublish, getMyChurchMembership } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ ok: true, items: [], page: 1, pageSize: 20, total: 0, hasMore: false });

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(sp.get("pageSize") || "20") || 20));

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const admin = getSupabaseAdmin();
  const { data, error, count } = await admin
    .from("church_events")
    .select("id,title,description,starts_at,ends_at,location", { count: "exact" })
    .eq("church_id", membership.church_id)
    .order("starts_at", { ascending: true })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const total = count ?? 0;
  return NextResponse.json({ ok: true, items: data ?? [], page, pageSize, total, hasMore: total > page * pageSize });
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
