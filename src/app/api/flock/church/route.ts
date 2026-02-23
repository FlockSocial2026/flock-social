import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getMyChurchMembership } from "@/lib/flockAuthz";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) {
    return NextResponse.json({ ok: true, church: null, membership: null });
  }

  const admin = getSupabaseAdmin();
  const { data: church, error } = await admin
    .from("churches")
    .select("id,name,slug,city,state")
    .eq("id", membership.church_id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, church, membership: { role: membership.role } });
}
