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

  const [snapshotRes, dailyBriefRes, nextActionsRes] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/snapshot"),
    fetchJson(req, "/api/flock/ops-health/daily-brief"),
    fetchJson(req, "/api/flock/ops-health/next-actions"),
  ]);

  if (snapshotRes.status !== 200 || dailyBriefRes.status !== 200 || nextActionsRes.status !== 200) {
    return NextResponse.json(
      {
        ok: false,
        error: "executive_update_unavailable",
        statuses: {
          snapshot: snapshotRes.status,
          dailyBrief: dailyBriefRes.status,
          nextActions: nextActionsRes.status,
        },
      },
      { status: 500 }
    );
  }

  const snapshot = snapshotRes.json?.snapshot ?? {};
  const dailyBrief = dailyBriefRes.json ?? {};
  const nextActions = Array.isArray(nextActionsRes.json?.items) ? nextActionsRes.json.items : [];

  const topActions = nextActions.slice(0, 3).map((item: { action?: string }) => String(item?.action || ""));

  const concise = [
    `Status: ${snapshot.healthy ? "healthy" : "attention"} (critical ${Number(snapshot.critical || 0)}, warning ${Number(snapshot.warning || 0)}, incidents ${Number(snapshot.openIncidents || 0)})`,
    `Headline: ${String(dailyBrief.headline || "Operator daily brief unavailable")}`,
    topActions.length ? `Top actions: ${topActions.join(" | ")}` : "Top actions: none",
  ];

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    status: {
      healthy: Boolean(snapshot.healthy),
      critical: Number(snapshot.critical || 0),
      warning: Number(snapshot.warning || 0),
      openIncidents: Number(snapshot.openIncidents || 0),
      runbookLevel: String(snapshot.runbookLevel || "none"),
    },
    headline: String(dailyBrief.headline || ""),
    topActions,
    concise,
    reportText: concise.join("\n"),
  });
}
