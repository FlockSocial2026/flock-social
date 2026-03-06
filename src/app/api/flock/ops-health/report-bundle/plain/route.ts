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
    const summaryRes = await fetchJson(req, "/api/flock/ops-health/summary");
    if (summaryRes.status === 200) {
      const s = summaryRes.json?.status ?? {};
      const summaryLine = `Ops ${s.healthy ? "healthy" : "attention"} | critical ${Number(s.criticalCount || 0)} | warning ${Number(s.warningCount || 0)}`;
      bundleRes = {
        status: 200,
        json: {
          summaryLine,
          bundle: {
            executive: { reportText: "Fallback executive" },
            hourly: { report: "Fallback hourly" },
            overnight: { report: "Fallback overnight" },
          },
        },
      };
      briefRes = { status: 200, json: { brief: summaryLine, maxLen: summaryLine.length } };
    }
  }

  if (bundleRes.status !== 200 || briefRes.status !== 200) {
    return NextResponse.json(
      { ok: false, error: "report_bundle_plain_unavailable", statuses: { bundle: bundleRes.status, brief: briefRes.status } },
      { status: 500 }
    );
  }

  const bundle = bundleRes.json;
  const lines = [
    "Flock Ops Report Bundle",
    `Summary: ${String(bundle?.summaryLine || "n/a")}`,
    `Brief: ${String(briefRes.json?.brief || "")}`,
    "Executive:",
    String(bundle?.bundle?.executive?.reportText || ""),
    "Hourly:",
    String(bundle?.bundle?.hourly?.report || ""),
    "Overnight:",
    String(bundle?.bundle?.overnight?.report || ""),
  ];

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    lines,
    text: lines.join("\n"),
    charCount: lines.join("\n").length,
  });
}
