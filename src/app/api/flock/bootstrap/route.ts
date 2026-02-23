import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMyChurchMembership } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const existing = await getMyChurchMembership(auth.user.id);
  if (existing) {
    return NextResponse.json({ error: "User already belongs to a church" }, { status: 400 });
  }

  const body = await req.json();
  const name = String(body?.name || "").trim();
  const city = String(body?.city || "").trim();
  const state = String(body?.state || "").trim();
  const providedSlug = String(body?.slug || "").trim();
  const slug = normalizeSlug(providedSlug || name);

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "valid slug is required" }, { status: 400 });

  const admin = getSupabaseAdmin();

  const { data: church, error: churchErr } = await admin
    .from("churches")
    .insert({ name, slug, city: city || null, state: state || null })
    .select("id,slug")
    .single();

  if (churchErr) return NextResponse.json({ error: churchErr.message }, { status: 500 });

  const { error: memberErr } = await admin.from("church_memberships").insert({
    church_id: church.id,
    user_id: auth.user.id,
    role: "church_admin",
  });

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, churchId: church.id, slug: church.slug, role: "church_admin" }, { status: 201 });
}
