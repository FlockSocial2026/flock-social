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

function trim(text: string, max = 2000) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (!canPublish(membership.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  let [plainRes, briefRes] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/report-bundle/plain"),
    fetchJson(req, "/api/flock/ops-health/report-bundle/brief"),
  ]);

  if (plainRes.status !== 200) {
    const summaryRes = await fetchJson(req, "/api/flock/ops-health/summary");
    if (summaryRes.status === 200) {
      const s = summaryRes.json?.status ?? {};
      const summaryLine = `Ops ${s.healthy ? "healthy" : "attention"} | critical ${Number(s.criticalCount || 0)} | warning ${Number(s.warningCount || 0)}`;
      plainRes = {
        status: 200,
        json: {
          text: `Flock Ops Report Bundle\nSummary: ${summaryLine}`,
          lines: ["Flock Ops Report Bundle", `Summary: ${summaryLine}`],
          charCount: summaryLine.length + 29,
        },
      };
      if (briefRes.status !== 200) briefRes = { status: 200, json: { brief: summaryLine, maxLen: summaryLine.length } };
    }
  }

  if (briefRes.status !== 200 && plainRes.status === 200) {
    const firstSummary = Array.isArray(plainRes.json?.lines)
      ? String((plainRes.json.lines as string[]).find((line) => line.startsWith("Summary:")) || "")
      : "";
    const fallbackBrief = firstSummary ? firstSummary.replace(/^Summary:\s*/, "") : "Ops update ready.";
    briefRes = { status: 200, json: { brief: fallbackBrief, maxLen: fallbackBrief.length } };
  }

  if (plainRes.status !== 200 || briefRes.status !== 200) {
    return NextResponse.json(
      { ok: false, error: "report_bundle_signal_unavailable", statuses: { plain: plainRes.status, brief: briefRes.status } },
      { status: 500 }
    );
  }

  const text = trim(String(plainRes.json?.text || ""));
  const brief = String(briefRes.json?.brief || "");

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    text,
    brief,
    charCount: text.length,
  });
}
