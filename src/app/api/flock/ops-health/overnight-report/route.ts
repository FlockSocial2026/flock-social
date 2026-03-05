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

  let [snapshotRes, packetRes, dailyBriefRes, nextActionsRes] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/snapshot"),
    fetchJson(req, "/api/flock/ops-health/packet"),
    fetchJson(req, "/api/flock/ops-health/daily-brief"),
    fetchJson(req, "/api/flock/ops-health/next-actions"),
  ]);

  if (snapshotRes.status !== 200) {
    const [summaryRes, incidentsRes, runbookRes] = await Promise.all([
      fetchJson(req, "/api/flock/ops-health/summary"),
      fetchJson(req, "/api/flock/ops-health/incidents"),
      fetchJson(req, "/api/flock/ops-health/runbook"),
    ]);

    if (summaryRes.status === 200 && incidentsRes.status === 200 && runbookRes.status === 200) {
      const s = summaryRes.json?.status ?? {};
      snapshotRes = {
        status: 200,
        json: {
          snapshot: {
            healthy: Boolean(s.healthy),
            critical: Number(s.criticalCount || 0),
            warning: Number(s.warningCount || 0),
            openIncidents: Number(incidentsRes.json?.openCount || 0),
            runbookLevel: String(runbookRes.json?.level || "none"),
          },
        },
      };
    }
  }

  if (packetRes.status !== 200) {
    const [summaryRes, incidentsRes, runbookRes, handoffRes] = await Promise.all([
      fetchJson(req, "/api/flock/ops-health/summary"),
      fetchJson(req, "/api/flock/ops-health/incidents"),
      fetchJson(req, "/api/flock/ops-health/runbook"),
      fetchJson(req, "/api/flock/ops-health/handoff"),
    ]);

    if (summaryRes.status === 200 && incidentsRes.status === 200 && runbookRes.status === 200) {
      packetRes = {
        status: 200,
        json: {
          packetVersion: "v1-fallback",
          packet: {
            summary: summaryRes.json,
            incidents: incidentsRes.json,
            runbook: runbookRes.json,
            handoff: handoffRes.status === 200 ? handoffRes.json : null,
          },
        },
      };
    }
  }

  if (snapshotRes.status !== 200 || packetRes.status !== 200 || dailyBriefRes.status !== 200 || nextActionsRes.status !== 200) {
    return NextResponse.json(
      {
        ok: false,
        error: "overnight_report_unavailable",
        statuses: {
          snapshot: snapshotRes.status,
          packet: packetRes.status,
          dailyBrief: dailyBriefRes.status,
          nextActions: nextActionsRes.status,
        },
      },
      { status: 500 }
    );
  }

  const snapshot = snapshotRes.json?.snapshot ?? {};
  const topActions = Array.isArray(nextActionsRes.json?.items)
    ? nextActionsRes.json.items.slice(0, 5).map((item: { priority?: string; action?: string }) => ({
        priority: String(item?.priority || "P2"),
        action: String(item?.action || ""),
      }))
    : [];

  const report = [
    "Overnight Full Report",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Ops posture: ${snapshot.healthy ? "healthy" : "attention"} (critical ${Number(snapshot.critical || 0)}, warning ${Number(snapshot.warning || 0)}, open incidents ${Number(snapshot.openIncidents || 0)}, runbook ${String(snapshot.runbookLevel || "none")})`,
    `Daily brief: ${String(dailyBriefRes.json?.headline || "No headline available")}`,
    `Packet version: ${String(packetRes.json?.packetVersion || "v1")}`,
    "",
    "Top morning actions:",
    ...topActions.map((item: { priority: string; action: string }, idx: number) => `${idx + 1}. [${item.priority}] ${item.action}`),
  ].join("\n");

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    snapshot,
    dailyBriefHeadline: String(dailyBriefRes.json?.headline || ""),
    packetVersion: String(packetRes.json?.packetVersion || "v1"),
    topActions,
    report,
  });
}
