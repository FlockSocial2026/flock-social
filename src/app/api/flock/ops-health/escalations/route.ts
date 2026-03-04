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

  const [alerts, nextActions] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/alerts"),
    fetchJson(req, "/api/flock/ops-health/next-actions"),
  ]);

  if (alerts.status !== 200 || nextActions.status !== 200) {
    return NextResponse.json({ ok: false, error: "escalation_inputs_unavailable" }, { status: 500 });
  }

  const alertItems = Array.isArray(alerts.json?.alerts) ? alerts.json.alerts : [];
  const actionItems = Array.isArray(nextActions.json?.items) ? nextActions.json.items : [];

  const criticalCount = alertItems.filter((a: { level?: string }) => a.level === "critical").length;
  const warningCount = alertItems.filter((a: { level?: string }) => a.level === "warning").length;

  const level: "none" | "watch" | "escalate" = criticalCount > 0 ? "escalate" : warningCount > 0 ? "watch" : "none";

  const protocol =
    level === "escalate"
      ? [
          "Open incident commander channel and assign an owner now.",
          "Execute all P0 actions first; confirm completion in runbook.",
          "Re-check ops summary after actions and update status every 15 minutes.",
        ]
      : level === "watch"
      ? [
          "Execute P1 actions in order and monitor for critical transitions.",
          "Review T-24h and T-72h dispatch coverage before next event window.",
        ]
      : ["No escalation required. Continue standard monitoring cadence."];

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    level,
    counts: { critical: criticalCount, warning: warningCount },
    prioritizedActions: actionItems.slice(0, 5),
    protocol,
  });
}
