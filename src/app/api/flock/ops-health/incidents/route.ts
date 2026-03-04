import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canPublish, getMyChurchMembership } from "@/lib/flockAuthz";

async function fetchAlerts(req: NextRequest) {
  const base = req.nextUrl.origin;
  const res = await fetch(`${base}/api/flock/ops-health/alerts`, {
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

  const alerts = await fetchAlerts(req);
  if (alerts.status !== 200) {
    return NextResponse.json({ ok: false, error: "alerts_unavailable", alertsStatus: alerts.status }, { status: 500 });
  }

  const items = (Array.isArray(alerts.json?.alerts) ? alerts.json.alerts : [])
    .filter((a: { level?: string }) => a.level === "critical" || a.level === "warning")
    .map((a: { level: string; key: string; message: string; action: string }) => ({
      id: `incident_${a.key}`,
      severity: a.level,
      key: a.key,
      summary: a.message,
      action: a.action,
      acknowledged: false,
    }));

  return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), openCount: items.length, incidents: items });
}
