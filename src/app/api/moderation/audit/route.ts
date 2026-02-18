import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireModerator } from "@/lib/moderationAuth";

const ALLOWED_STATUSES = new Set(["open", "reviewing", "resolved", "dismissed"]);
const ALLOWED_TARGETS = new Set(["post", "comment", "user"]);

function parseIntSafe(input: string | null, fallback: number) {
  const n = Number(input);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function GET(req: NextRequest) {
  const auth = await requireModerator(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const sp = req.nextUrl.searchParams;
  const format = sp.get("format") || "json";
  const status = sp.get("status");
  const targetType = sp.get("targetType");
  const from = sp.get("from");
  const to = sp.get("to");

  const page = parseIntSafe(sp.get("page"), 1);
  const pageSize = Math.min(parseIntSafe(sp.get("pageSize"), 100), 500);

  const admin = getSupabaseAdmin();
  let query = admin
    .from("reports")
    .select("id,target_type,status,reason,created_at,reviewed_at,reviewer_id,resolution_note", { count: "exact" })
    .not("reviewed_at", "is", null)
    .order("reviewed_at", { ascending: false });

  if (status && ALLOWED_STATUSES.has(status)) query = query.eq("status", status);
  if (targetType && ALLOWED_TARGETS.has(targetType)) query = query.eq("target_type", targetType);
  if (from) query = query.gte("reviewed_at", from);
  if (to) query = query.lte("reviewed_at", to);

  const fromIndex = (page - 1) * pageSize;
  const toIndex = fromIndex + pageSize - 1;

  const { data, error, count } = await query.range(fromIndex, toIndex);
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

  return NextResponse.json({
    ok: true,
    items,
    page,
    pageSize,
    total: count ?? items.length,
    hasMore: (count ?? 0) > page * pageSize,
    filters: { status: status ?? null, targetType: targetType ?? null, from: from ?? null, to: to ?? null },
  });
}
