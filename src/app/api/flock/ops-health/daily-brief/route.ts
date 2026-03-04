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

  const [summary, incidents, nextActions] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/summary"),
    fetchJson(req, "/api/flock/ops-health/incidents"),
    fetchJson(req, "/api/flock/ops-health/next-actions"),
  ]);

  if (summary.status !== 200 || incidents.status !== 200 || nextActions.status !== 200) {
    return NextResponse.json({ ok: false, error: "daily_brief_inputs_unavailable" }, { status: 500 });
  }

  const healthy = Boolean(summary.json?.status?.healthy);
  const critical = Number(summary.json?.status?.criticalCount || 0);
  const warning = Number(summary.json?.status?.warningCount || 0);
  const openIncidents = Number(incidents.json?.openCount || 0);
  const topActions = Array.isArray(nextActions.json?.items) ? nextActions.json.items.slice(0, 3) : [];

  const headline = healthy
    ? "Ops healthy. Continue standard cadence."
    : critical > 0
    ? `Critical attention required: ${critical} critical issue(s).`
    : `Watch state: ${warning} warning issue(s).`;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    headline,
    metrics: { healthy, critical, warning, openIncidents },
    topActions,
  });
}
