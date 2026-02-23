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
    .from("church_events")
    .select("id,title,description,starts_at,ends_at,location")
    .eq("church_id", membership.church_id)
    .order("starts_at", { ascending: true })
    .limit(100);

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
  const description = String(body?.description || "").trim();
  const startsAt = String(body?.startsAt || "").trim();
  const endsAt = String(body?.endsAt || "").trim();
  const location = String(body?.location || "").trim();

  if (!title || !startsAt) return NextResponse.json({ error: "title and startsAt are required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("church_events")
    .insert({
      church_id: membership.church_id,
      author_user_id: auth.user.id,
      title,
      description: description || null,
      starts_at: startsAt,
      ends_at: endsAt || null,
      location: location || null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}
