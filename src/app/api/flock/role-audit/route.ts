import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMyChurchMembership } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const me = await getMyChurchMembership(auth.user.id);
  if (!me) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (me.role !== "church_admin" && me.role !== "pastor_staff") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") || "1") || 1);
  const pageSize = Math.min(200, Math.max(1, Number(sp.get("pageSize") || "50") || 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const admin = getSupabaseAdmin();
  const { data, error, count } = await admin
    .from("flock_role_audit")
    .select("id,membership_id,actor_user_id,target_user_id,old_role,new_role,changed_at", { count: "exact" })
    .eq("church_id", me.church_id)
    .order("changed_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  return NextResponse.json({ ok: true, items: data ?? [], page, pageSize, total, hasMore: total > page * pageSize });
}
