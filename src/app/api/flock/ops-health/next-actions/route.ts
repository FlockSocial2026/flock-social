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

  const [alerts, guidance] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/alerts"),
    fetchJson(req, "/api/flock/ops-health/explain"),
  ]);

  if (alerts.status !== 200 || guidance.status !== 200) {
    return NextResponse.json({ ok: false, error: "next_actions_unavailable" }, { status: 500 });
  }

  const alertItems = Array.isArray(alerts.json?.alerts) ? alerts.json.alerts : [];
  const guidanceItems = Array.isArray(guidance.json?.guidance?.recommendedActions)
    ? guidance.json.guidance.recommendedActions
    : [];

  const prioritized = [
    ...alertItems
      .filter((a: { level?: string }) => a.level === "critical")
      .map((a: { key: string; action: string }) => ({ priority: "P0", key: a.key, action: a.action })),
    ...alertItems
      .filter((a: { level?: string }) => a.level === "warning")
      .map((a: { key: string; action: string }) => ({ priority: "P1", key: a.key, action: a.action })),
    ...guidanceItems.map((action: string, idx: number) => ({ priority: "P2", key: `guidance_${idx + 1}`, action })),
  ].slice(0, 8);

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    total: prioritized.length,
    items: prioritized,
  });
}
