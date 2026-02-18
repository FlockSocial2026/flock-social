import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseAnonServer } from "@/lib/supabaseAdmin";

const parseModerators = () =>
  (process.env.MODERATOR_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

async function requireModerator(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { ok: false as const, status: 401, message: "Missing bearer token" };

  const anon = getSupabaseAnonServer();
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user?.email) {
    return { ok: false as const, status: 401, message: "Invalid auth token" };
  }

  const moderators = parseModerators();
  const email = data.user.email.toLowerCase();
  if (!moderators.includes(email)) {
    return { ok: false as const, status: 403, message: "Not authorized for moderation" };
  }

  return { ok: true as const, userId: data.user.id, email };
}

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
