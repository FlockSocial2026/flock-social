import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canPublish, getMyChurchMembership } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Cadence = "T-72h" | "T-24h" | "T-2h";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || "1") || 1);
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("pageSize") || "50") || 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const cadence = String(sp.get("cadence") || "").trim() as Cadence | "";
  const audience = String(sp.get("audience") || "").trim();
  const fromIso = String(sp.get("from") || "").trim();
  const toIso = String(sp.get("to") || "").trim();

  const admin = getSupabaseAdmin();
  let query = admin
    .from("flock_dispatch_logs")
    .select("id,event_id,event_title,audience,cadence,created_at", { count: "exact" })
    .eq("church_id", membership.church_id);

  if (cadence && ["T-72h", "T-24h", "T-2h"].includes(cadence)) {
    query = query.eq("cadence", cadence);
  }
  if (audience) query = query.eq("audience", audience);
  if (fromIso) query = query.gte("created_at", fromIso);
  if (toIso) query = query.lte("created_at", toIso);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const total = count ?? 0;
  return NextResponse.json({
    ok: true,
    items: data ?? [],
    page,
    pageSize,
    total,
    hasMore: total > page * pageSize,
    filters: { cadence: cadence || null, audience: audience || null, from: fromIso || null, to: toIso || null },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (!canPublish(membership.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const body = await req.json();
  const eventId = String(body?.eventId || "").trim();
  const eventTitle = String(body?.eventTitle || "").trim();
  const audience = String(body?.audience || "").trim();
  const cadence = String(body?.cadence || "").trim() as Cadence;

  if (!eventTitle) return NextResponse.json({ error: "eventTitle is required" }, { status: 400 });
  if (!audience) return NextResponse.json({ error: "audience is required" }, { status: 400 });
  if (!["T-72h", "T-24h", "T-2h"].includes(cadence)) {
    return NextResponse.json({ error: "cadence must be T-72h, T-24h, or T-2h" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("flock_dispatch_logs")
    .insert({
      church_id: membership.church_id,
      actor_user_id: auth.user.id,
      event_id: eventId || null,
      event_title: eventTitle,
      audience,
      cadence,
    })
    .select("id,event_id,event_title,audience,cadence,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
