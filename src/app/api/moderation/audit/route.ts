import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireModerator } from "@/lib/moderationAuth";

export async function GET(req: NextRequest) {
  const auth = await requireModerator(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const format = req.nextUrl.searchParams.get("format") || "json";
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("reports")
    .select("id,target_type,status,reason,created_at,reviewed_at,reviewer_id,resolution_note")
    .not("reviewed_at", "is", null)
    .order("reviewed_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = data ?? [];

  if (format === "csv") {
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes("\n") || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = ["id", "target_type", "status", "reason", "created_at", "reviewed_at", "reviewer_id", "resolution_note"].join(",");
    const rows = items.map((r: any) =>
      [r.id, r.target_type, r.status, r.reason, r.created_at, r.reviewed_at, r.reviewer_id, r.resolution_note]
        .map(escape)
        .join(","),
    );

    return new NextResponse([header, ...rows].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=moderation-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      },
    });
  }

  return NextResponse.json({ ok: true, count: items.length, items });
}
