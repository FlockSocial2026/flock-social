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

  if (bundleRes.status !== 200) {
    const [summaryRes, actionsRes] = await Promise.all([
      fetchJson(req, "/api/flock/ops-health/summary"),
      fetchJson(req, "/api/flock/ops-health/next-actions"),
    ]);

    if (summaryRes.status === 200 && actionsRes.status === 200) {
      const s = summaryRes.json?.status ?? {};
      const topAction = Array.isArray(actionsRes.json?.items) ? String(actionsRes.json.items[0]?.action || "Review priority queue") : "Review priority queue";
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
            executive: { headline: String(topAction), reportText: String(topAction), topActions: [topAction] },
            hourly: { report: String(topAction), dispatchCount: 0, timelineSampleSize: 0 },
            overnight: { report: String(topAction), packetVersion: "v1-fallback", topActions: [{ priority: "P1", action: topAction }] },
          },
        },
      };
    }
  }

  if (briefRes.status !== 200 && bundleRes.status === 200) {
    const p = bundleRes.json?.posture ?? {};
    briefRes = {
      status: 200,
      json: {
        brief: `Ops ${p.healthy ? "healthy" : "attention"} | C:${Number(p.critical || 0)} W:${Number(p.warning || 0)} I:${Number(p.openIncidents || 0)} | Next: Review priority queue.`,
        maxLen: 120,
      },
    };
  }

  if (bundleRes.status !== 200 || briefRes.status !== 200) {
    return NextResponse.json(
      { ok: false, error: "report_bundle_slack_unavailable", statuses: { bundle: bundleRes.status, brief: briefRes.status } },
      { status: 500 }
    );
  }

  const bundle = bundleRes.json;
  const brief = briefRes.json;
  const exec = bundle?.bundle?.executive ?? {};
  const hourly = bundle?.bundle?.hourly ?? {};
  const overnight = bundle?.bundle?.overnight ?? {};

  const blocks = [
    {
      type: "header",
      text: { type: "plain_text", text: "Flock Ops Report Bundle" },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Summary*\n${String(bundle?.summaryLine || "n/a")}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Brief*\n${String(brief?.brief || "")}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Executive*\n${String(exec?.headline || "")}\n${String(exec?.reportText || "")}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Hourly*\n${String(hourly?.report || "")}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Overnight*\n${String(overnight?.report || "")}` },
    },
  ];

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    text: String(brief?.brief || ""),
    blocks,
  });
}
