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
    const summaryRes = await fetchJson(req, "/api/flock/ops-health/summary");
    if (summaryRes.status === 200) {
      const s = summaryRes.json?.status ?? {};
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
            executive: { headline: "Fallback executive", reportText: "Fallback executive", topActions: [] },
            hourly: { report: "Fallback hourly", dispatchCount: 0, timelineSampleSize: 0 },
            overnight: { report: "Fallback overnight", packetVersion: "v1-fallback", topActions: [] },
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
        brief: `Ops ${p.healthy ? "healthy" : "attention"} | C:${Number(p.critical || 0)} W:${Number(p.warning || 0)} I:${Number(p.openIncidents || 0)}`,
        maxLen: 96,
      },
    };
  }

  if (bundleRes.status !== 200 || briefRes.status !== 200) {
    return NextResponse.json(
      { ok: false, error: "report_bundle_discord_unavailable", statuses: { bundle: bundleRes.status, brief: briefRes.status } },
      { status: 500 }
    );
  }

  const bundle = bundleRes.json;
  const exec = bundle?.bundle?.executive ?? {};
  const hourly = bundle?.bundle?.hourly ?? {};
  const overnight = bundle?.bundle?.overnight ?? {};

  const embed = {
    title: "Flock Ops Report Bundle",
    description: String(bundle?.summaryLine || briefRes.json?.brief || ""),
    color: bundle?.posture?.healthy ? 0x22c55e : 0xf59e0b,
    fields: [
      { name: "Executive", value: String(exec?.headline || exec?.reportText || "n/a").slice(0, 1024), inline: false },
      { name: "Hourly", value: String(hourly?.report || "n/a").slice(0, 1024), inline: false },
      { name: "Overnight", value: String(overnight?.report || "n/a").slice(0, 1024), inline: false },
    ],
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    content: String(briefRes.json?.brief || ""),
    embeds: [embed],
  });
}
