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

  let bundleRes = await fetchJson(req, "/api/flock/ops-health/report-bundle");
  if (bundleRes.status !== 200) {
    const [executiveRes, hourlyRes, overnightRes, snapshotRes] = await Promise.all([
      fetchJson(req, "/api/flock/ops-health/executive-update"),
      fetchJson(req, "/api/flock/ops-health/hourly-report"),
      fetchJson(req, "/api/flock/ops-health/overnight-report"),
      fetchJson(req, "/api/flock/ops-health/snapshot"),
    ]);

    if (executiveRes.status === 200 && hourlyRes.status === 200 && overnightRes.status === 200 && snapshotRes.status === 200) {
      const s = snapshotRes.json?.snapshot ?? {};
      bundleRes = {
        status: 200,
        json: {
          summaryLine: `Ops ${s.healthy ? "healthy" : "attention"} | critical ${Number(s.critical || 0)} | warning ${Number(s.warning || 0)} | incidents ${Number(s.openIncidents || 0)} | runbook ${String(s.runbookLevel || "none")}`,
          posture: {
            healthy: Boolean(s.healthy),
            critical: Number(s.critical || 0),
            warning: Number(s.warning || 0),
            openIncidents: Number(s.openIncidents || 0),
            runbookLevel: String(s.runbookLevel || "none"),
          },
          bundle: {
            executive: executiveRes.json,
            hourly: hourlyRes.json,
            overnight: overnightRes.json,
          },
        },
      };
    } else {
      const [summaryRes, dailyBriefRes, nextActionsRes] = await Promise.all([
        fetchJson(req, "/api/flock/ops-health/summary"),
        fetchJson(req, "/api/flock/ops-health/daily-brief"),
        fetchJson(req, "/api/flock/ops-health/next-actions"),
      ]);

      if (summaryRes.status === 200 && dailyBriefRes.status === 200 && nextActionsRes.status === 200) {
        const s = summaryRes.json?.status ?? {};
        const actions = Array.isArray(nextActionsRes.json?.items)
          ? nextActionsRes.json.items.slice(0, 3).map((item: { action?: string }) => String(item?.action || ""))
          : [];

        bundleRes = {
          status: 200,
          json: {
            summaryLine: `Ops ${s.healthy ? "healthy" : "attention"} | critical ${Number(s.criticalCount || 0)} | warning ${Number(s.warningCount || 0)}`,
            posture: {
              healthy: Boolean(s.healthy),
              critical: Number(s.criticalCount || 0),
              warning: Number(s.warningCount || 0),
              openIncidents: 0,
              runbookLevel: "watch",
            },
            bundle: {
              executive: {
                headline: String(dailyBriefRes.json?.headline || ""),
                reportText: `Status: ${s.healthy ? "healthy" : "attention"} (critical ${Number(s.criticalCount || 0)}, warning ${Number(s.warningCount || 0)})`,
              },
              hourly: { report: `Top actions: ${actions.join(" | ") || "none"}` },
              overnight: { report: `Morning focus: ${actions.join(" | ") || "none"}` },
            },
          },
        };
      }
    }
  }

  if (bundleRes.status !== 200) {
    return NextResponse.json({ ok: false, error: "report_bundle_markdown_unavailable", bundleStatus: bundleRes.status }, { status: 500 });
  }

  const bundle = bundleRes.json;
  const exec = bundle?.bundle?.executive ?? {};
  const hourly = bundle?.bundle?.hourly ?? {};
  const overnight = bundle?.bundle?.overnight ?? {};
  const posture = bundle?.posture ?? {};

  const markdown = [
    "# Flock Ops Report Bundle",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Summary: ${String(bundle?.summaryLine || "n/a")}`,
    "",
    "## Posture",
    `- Healthy: ${Boolean(posture.healthy)}`,
    `- Critical: ${Number(posture.critical || 0)}`,
    `- Warning: ${Number(posture.warning || 0)}`,
    `- Open incidents: ${Number(posture.openIncidents || 0)}`,
    `- Runbook level: ${String(posture.runbookLevel || "none")}`,
    "",
    "## Executive Update",
    `${String(exec.headline || "")}`,
    "",
    "```text",
    `${String(exec.reportText || "")}`,
    "```",
    "",
    "## Hourly Report",
    "```text",
    `${String(hourly.report || "")}`,
    "```",
    "",
    "## Overnight Report",
    "```text",
    `${String(overnight.report || "")}`,
    "```",
  ].join("\n");

  return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), markdown });
}
