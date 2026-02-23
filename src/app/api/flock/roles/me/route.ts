import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { capabilityMap, getMyChurchMembership } from "@/lib/flockAuthz";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) {
    return NextResponse.json({ ok: true, role: null, capabilities: capabilityMap("member") });
  }

  return NextResponse.json({ ok: true, role: membership.role, capabilities: capabilityMap(membership.role) });
}
