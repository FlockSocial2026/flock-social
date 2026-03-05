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

  let [executiveRes, hourlyRes, overnightRes, snapshotRes] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/executive-update"),
    fetchJson(req, "/api/flock/ops-health/hourly-report"),
    fetchJson(req, "/api/flock/ops-health/overnight-report"),
    fetchJson(req, "/api/flock/ops-health/snapshot"),
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

  if (executiveRes.status !== 200 || hourlyRes.status !== 200 || overnightRes.status !== 200 || snapshotRes.status !== 200) {
    return NextResponse.json(
      {
        ok: false,
        error: "report_bundle_unavailable",
        statuses: {
          executive: executiveRes.status,
          hourly: hourlyRes.status,
          overnight: overnightRes.status,
          snapshot: snapshotRes.status,
        },
      },
      { status: 500 }
    );
  }

  const snapshot = snapshotRes.json?.snapshot ?? {};

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    posture: {
      healthy: Boolean(snapshot.healthy),
      critical: Number(snapshot.critical || 0),
      warning: Number(snapshot.warning || 0),
      openIncidents: Number(snapshot.openIncidents || 0),
      runbookLevel: String(snapshot.runbookLevel || "none"),
    },
    bundle: {
      executive: {
        headline: String(executiveRes.json?.headline || ""),
        reportText: String(executiveRes.json?.reportText || ""),
        topActions: Array.isArray(executiveRes.json?.topActions) ? executiveRes.json.topActions : [],
      },
      hourly: {
        report: String(hourlyRes.json?.report || ""),
        dispatchCount: Number(hourlyRes.json?.dispatchCount || 0),
        timelineSampleSize: Number(hourlyRes.json?.timelineSampleSize || 0),
      },
      overnight: {
        report: String(overnightRes.json?.report || ""),
        packetVersion: String(overnightRes.json?.packetVersion || "v1"),
        topActions: Array.isArray(overnightRes.json?.topActions) ? overnightRes.json.topActions : [],
      },
    },
    summaryLine: `Ops ${snapshot.healthy ? "healthy" : "attention"} | critical ${Number(snapshot.critical || 0)} | warning ${Number(snapshot.warning || 0)} | incidents ${Number(snapshot.openIncidents || 0)} | runbook ${String(snapshot.runbookLevel || "none")}`,
  });
}
