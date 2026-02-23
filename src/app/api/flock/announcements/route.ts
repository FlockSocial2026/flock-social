import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canPublish, getMyChurchMembership } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ ok: true, items: [] });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("church_announcements")
    .select("id,title,body,audience,published_at")
    .eq("church_id", membership.church_id)
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
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
  if (!["all", "members", "leaders"].includes(audience)) {
    return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
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
