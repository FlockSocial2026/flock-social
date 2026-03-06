import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canPublish, getMyChurchMembership } from "@/lib/flockAuthz";

async function fetchJson(req: NextRequest, path: string) {
  const base = req.nextUrl.origin;
  const res = await fetch(`${base}${path}`, {
    headers: { authorization: req.headers.get("authorization") || "" },
    cache: "no-store",
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : {} };
}

function trimToLen(text: string, max = 320) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (!canPublish(membership.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  let [briefRes, summaryRes, actionsRes] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/report-bundle/brief"),
    fetchJson(req, "/api/flock/ops-health/summary"),
    fetchJson(req, "/api/flock/ops-health/next-actions"),
  ]);

  if (summaryRes.status !== 200) {
    return NextResponse.json(
      { ok: false, error: "report_bundle_sms_unavailable", statuses: { brief: briefRes.status, summary: summaryRes.status, actions: actionsRes.status } },
      { status: 500 }
    );
  }

  const s = summaryRes.json?.status ?? {};
  const topAction = Array.isArray(actionsRes.json?.items)
    ? String(actionsRes.json.items[0]?.action || "Review priority queue")
    : "Review priority queue";

  const fallbackBrief = `Ops ${s.healthy ? "healthy" : "attention"} | C:${Number(s.criticalCount || 0)} W:${Number(s.warningCount || 0)} | Next: ${topAction}`;
  const brief = briefRes.status === 200 ? String(briefRes.json?.brief || fallbackBrief) : fallbackBrief;

  const sms = trimToLen(`${brief} | Action: ${topAction}`.replace(/\s+/g, " "));

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    sms,
    charCount: sms.length,
    segmentsEstimate: Math.ceil(sms.length / 160),
  });
}
