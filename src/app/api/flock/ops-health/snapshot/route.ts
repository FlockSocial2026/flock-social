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

  const packet = await fetchJson(req, "/api/flock/ops-health/packet");
  if (packet.status !== 200) {
    return NextResponse.json({ ok: false, error: "snapshot_unavailable", packetStatus: packet.status }, { status: 500 });
  }

  const p = packet.json?.packet ?? {};
  const summary = p.summary?.status ?? {};
  const incidents = p.incidents?.openCount ?? 0;
  const level = p.runbook?.level ?? "none";

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    snapshot: {
      healthy: Boolean(summary.healthy),
      critical: Number(summary.criticalCount || 0),
      warning: Number(summary.warningCount || 0),
      openIncidents: Number(incidents || 0),
      runbookLevel: String(level),
    },
    compactText: `Ops ${summary.healthy ? "healthy" : "attention"} | critical ${Number(summary.criticalCount || 0)} | warning ${Number(summary.warningCount || 0)} | incidents ${Number(incidents || 0)} | level ${String(level)}`,
  });
}
