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

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (!canPublish(membership.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const [bundleRes, actionsRes] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/report-bundle"),
    fetchJson(req, "/api/flock/ops-health/next-actions"),
  ]);

  if (bundleRes.status !== 200 || actionsRes.status !== 200) {
    return NextResponse.json(
      { ok: false, error: "report_bundle_brief_unavailable", statuses: { bundle: bundleRes.status, actions: actionsRes.status } },
      { status: 500 }
    );
  }

  const posture = bundleRes.json?.posture ?? {};
  const action = Array.isArray(actionsRes.json?.items) && actionsRes.json.items.length > 0
    ? String(actionsRes.json.items[0]?.action || "")
    : "Review priority queue.";

  const brief = `Ops ${posture.healthy ? "healthy" : "attention"} | C:${Number(posture.critical || 0)} W:${Number(posture.warning || 0)} I:${Number(posture.openIncidents || 0)} | Next: ${action}`;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    brief,
    maxLen: brief.length,
  });
}
