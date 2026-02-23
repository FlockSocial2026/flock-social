import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getMyChurchMembership } from "@/lib/flockAuthz";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });

  const { id } = await context.params;
  const body = await req.json();
  const status = String(body?.status || "").trim();

  if (!["going", "maybe", "not_going"].includes(status)) {
    return NextResponse.json({ error: "Invalid RSVP status" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: eventRow, error: eventErr } = await admin
    .from("church_events")
    .select("id,church_id")
    .eq("id", id)
    .maybeSingle();

  if (eventErr) return NextResponse.json({ error: eventErr.message }, { status: 500 });
  if (!eventRow) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (eventRow.church_id !== membership.church_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await admin.from("event_rsvps").upsert(
    { event_id: id, user_id: auth.user.id, status, updated_at: new Date().toISOString() },
    { onConflict: "event_id,user_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
