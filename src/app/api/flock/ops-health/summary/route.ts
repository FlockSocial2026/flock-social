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
  const json = text ? JSON.parse(text) : {};
  return { status: res.status, json };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (!canPublish(membership.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const [health, guidance, alerts] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health"),
    fetchJson(req, "/api/flock/ops-health/explain"),
    fetchJson(req, "/api/flock/ops-health/alerts"),
  ]);

  if (health.status !== 200 || guidance.status !== 200 || alerts.status !== 200) {
    return NextResponse.json(
      {
        ok: false,
        error: "ops_health_summary_failed",
        statuses: { health: health.status, guidance: guidance.status, alerts: alerts.status },
      },
      { status: 500 }
    );
  }

  const alertItems = Array.isArray(alerts.json?.alerts) ? alerts.json.alerts : [];
  const criticalCount = alertItems.filter((a: { level?: string }) => a.level === "critical").length;
  const warningCount = alertItems.filter((a: { level?: string }) => a.level === "warning").length;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    status: {
      healthy: criticalCount === 0,
      criticalCount,
      warningCount,
    },
    health: health.json,
    guidance: guidance.json,
    alerts: alerts.json,
  });
}
