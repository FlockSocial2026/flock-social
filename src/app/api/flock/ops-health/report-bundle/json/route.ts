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

  let [bundleRes, briefRes] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/report-bundle"),
    fetchJson(req, "/api/flock/ops-health/report-bundle/brief"),
  ]);

  if (bundleRes.status !== 200 || briefRes.status !== 200) {
    const [summaryRes, incidentsRes, runbookRes] = await Promise.all([
      fetchJson(req, "/api/flock/ops-health/summary"),
      fetchJson(req, "/api/flock/ops-health/incidents"),
      fetchJson(req, "/api/flock/ops-health/runbook"),
    ]);

    if (summaryRes.status === 200 && incidentsRes.status === 200 && runbookRes.status === 200) {
      const s = summaryRes.json?.status ?? {};
      const summaryLine = `Ops ${s.healthy ? "healthy" : "attention"} | critical ${Number(s.criticalCount || 0)} | warning ${Number(s.warningCount || 0)} | incidents ${Number(incidentsRes.json?.openCount || 0)} | runbook ${String(runbookRes.json?.level || "none")}`;
      bundleRes = {
        status: 200,
        json: {
          summaryLine,
          posture: {
            healthy: Boolean(s.healthy),
            critical: Number(s.criticalCount || 0),
            warning: Number(s.warningCount || 0),
            openIncidents: Number(incidentsRes.json?.openCount || 0),
            runbookLevel: String(runbookRes.json?.level || "none"),
          },
          bundle: {
            executive: { headline: "Fallback executive", reportText: "Fallback executive", topActions: [] },
            hourly: { report: "Fallback hourly", dispatchCount: 0, timelineSampleSize: 0 },
            overnight: { report: "Fallback overnight", packetVersion: "v1-fallback", topActions: [] },
          },
        },
      };
      briefRes = { status: 200, json: { brief: summaryLine, maxLen: summaryLine.length } };
    }
  }

  if (bundleRes.status !== 200 || briefRes.status !== 200) {
    return NextResponse.json(
      { ok: false, error: "report_bundle_json_unavailable", statuses: { bundle: bundleRes.status, brief: briefRes.status } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    brief: String(briefRes.json?.brief || ""),
    summaryLine: String(bundleRes.json?.summaryLine || ""),
    posture: bundleRes.json?.posture || {},
    bundle: bundleRes.json?.bundle || {},
  });
}
