import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMyChurchMembership } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const me = await getMyChurchMembership(auth.user.id);
  if (!me) return NextResponse.json({ error: "No church membership" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("church_memberships")
    .select("id,user_id,role,created_at")
    .eq("church_id", me.church_id)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}
