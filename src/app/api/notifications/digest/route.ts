import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseAnonServer } from "@/lib/supabaseAdmin";

type NotificationType = "like" | "comment" | "follow";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  const anon = getSupabaseAnonServer();
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user?.id) return NextResponse.json({ error: "Invalid auth token" }, { status: 401 });

  const userId = data.user.id;
  const admin = getSupabaseAdmin();

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error: rowsErr } = await admin
    .from("notifications")
    .select("id,type,created_at,read_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(250);

  if (rowsErr) return NextResponse.json({ error: rowsErr.message }, { status: 500 });

  const items = (rows ?? []) as { id: string; type: NotificationType; created_at: string; read_at: string | null }[];

  const unread = items.filter((n) => !n.read_at).length;
  const last24h = items.filter((n) => n.created_at >= since);

  const byType: Record<NotificationType, number> = { like: 0, comment: 0, follow: 0 };
  for (const row of last24h) byType[row.type] += 1;

  return NextResponse.json({
    ok: true,
    unread,
    last24hCount: last24h.length,
    byType,
    generatedAt: new Date().toISOString(),
  });
}
