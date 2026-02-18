import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireModerator } from "@/lib/moderationAuth";

export async function GET(req: NextRequest) {
  const auth = await requireModerator(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const status = req.nextUrl.searchParams.get("status") || "open";
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("reports")
    .select(
      "id,reporter_id,target_type,target_post_id,target_comment_id,target_user_id,reason,status,created_at,reviewed_at,reviewer_id,resolution_note",
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireModerator(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const body = await req.json();
  const reportId = String(body?.reportId || "");
  const status = String(body?.status || "");
  const resolutionNote = typeof body?.resolutionNote === "string" ? body.resolutionNote.trim() : null;

  if (!reportId) return NextResponse.json({ error: "reportId is required" }, { status: 400 });
  if (!["open", "reviewing", "resolved", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("reports")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewer_id: auth.userId,
      resolution_note: resolutionNote,
    })
    .eq("id", reportId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
