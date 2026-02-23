import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMyChurchMembership, isChurchRole } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ membershipId: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const me = await getMyChurchMembership(auth.user.id);
  if (!me || me.role !== "church_admin") {
    return NextResponse.json({ error: "Only church_admin can assign roles" }, { status: 403 });
  }

  const { membershipId } = await context.params;
  const body = await req.json();
  const role = String(body?.role || "").trim();

  if (!isChurchRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: target, error: targetErr } = await admin
    .from("church_memberships")
    .select("id,church_id,user_id,role")
    .eq("id", membershipId)
    .maybeSingle();

  if (targetErr) return NextResponse.json({ error: targetErr.message }, { status: 500 });
  if (!target) return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  if (target.church_id !== me.church_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (target.user_id === auth.user.id && role !== "church_admin") {
    return NextResponse.json({ error: "Cannot demote yourself" }, { status: 400 });
  }

  const { error } = await admin
    .from("church_memberships")
    .update({ role })
    .eq("id", membershipId)
    .eq("church_id", me.church_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (target.role !== role) {
    const { error: auditErr } = await admin.from("flock_role_audit").insert({
      church_id: me.church_id,
      membership_id: membershipId,
      actor_user_id: auth.user.id,
      target_user_id: target.user_id,
      old_role: target.role,
      new_role: role,
      changed_at: new Date().toISOString(),
    });

    if (auditErr) return NextResponse.json({ error: auditErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: membershipId, role });
}
