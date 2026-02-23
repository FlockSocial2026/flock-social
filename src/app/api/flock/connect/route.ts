import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await req.json();
  const churchSlug = String(body?.churchSlug || "").trim().toLowerCase();
  if (!churchSlug) return NextResponse.json({ error: "churchSlug is required" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: church, error: churchErr } = await admin
    .from("churches")
    .select("id")
    .eq("slug", churchSlug)
    .maybeSingle();

  if (churchErr) return NextResponse.json({ error: churchErr.message }, { status: 500 });
  if (!church) return NextResponse.json({ error: "Church not found" }, { status: 404 });

  const { error } = await admin.from("church_memberships").upsert(
    { church_id: church.id, user_id: auth.user.id, role: "member" },
    { onConflict: "church_id,user_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, connected: true });
}
