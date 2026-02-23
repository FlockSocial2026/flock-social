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
    .from("church_announcements")
    .select("id,title,body,audience,published_at", { count: "exact" })
    .eq("church_id", membership.church_id)
    .order("published_at", { ascending: false })
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
  const text = String(body?.body || "").trim();
  const audience = String(body?.audience || "all");

  if (!title || !text) return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  if (title.length > 120) return NextResponse.json({ error: "title too long (max 120)" }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: "body too long (max 4000)" }, { status: 400 });
  if (!["all", "members", "leaders"].includes(audience)) {
    return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: latest, error: latestErr } = await admin
    .from("church_announcements")
    .select("published_at")
    .eq("church_id", membership.church_id)
    .eq("author_user_id", auth.user.id)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) return NextResponse.json({ error: latestErr.message }, { status: 500 });

  const cooldownMinutes = Number(process.env.FLOCK_ANNOUNCEMENT_COOLDOWN_MINUTES || "2");
  if (latest?.published_at) {
    const msSinceLast = Date.now() - new Date(latest.published_at).getTime();
    if (msSinceLast < cooldownMinutes * 60_000) {
      return NextResponse.json(
        { error: `Publish cooldown active. Try again in ${cooldownMinutes} minutes.` },
        { status: 429 },
      );
    }
  }

  const { data, error } = await admin
    .from("church_announcements")
    .insert({
      church_id: membership.church_id,
      author_user_id: auth.user.id,
      title,
      body: text,
      audience,
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, published: true }, { status: 201 });
}
