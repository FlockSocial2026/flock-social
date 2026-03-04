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

  const [dailyBrief, runbook] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/daily-brief"),
    fetchJson(req, "/api/flock/ops-health/runbook"),
  ]);

  if (dailyBrief.status !== 200 || runbook.status !== 200) {
    return NextResponse.json({ ok: false, error: "handoff_inputs_unavailable" }, { status: 500 });
  }

  const lines = [
    `Headline: ${String(dailyBrief.json?.headline || "n/a")}`,
    `Critical: ${Number(dailyBrief.json?.metrics?.critical || 0)} | Warning: ${Number(dailyBrief.json?.metrics?.warning || 0)} | Incidents: ${Number(dailyBrief.json?.metrics?.openIncidents || 0)}`,
    `Escalation: ${String(runbook.json?.level || "none")}`,
    ...((Array.isArray(runbook.json?.checklist) ? runbook.json.checklist : []).slice(0, 5).map((c: { type: string; text: string }) => `- [${c.type}] ${c.text}`)),
  ];

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    handoffText: lines.join("\n"),
    brief: dailyBrief.json,
    runbook: runbook.json,
  });
}
