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

  const [summary, incidents, runbook, handoff, markdown] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/summary"),
    fetchJson(req, "/api/flock/ops-health/incidents"),
    fetchJson(req, "/api/flock/ops-health/runbook"),
    fetchJson(req, "/api/flock/ops-health/handoff"),
    fetchJson(req, "/api/flock/ops-health/handoff/markdown"),
  ]);

  const statusMap = {
    summary: summary.status,
    incidents: incidents.status,
    runbook: runbook.status,
    handoff: handoff.status,
    markdown: markdown.status,
  };

  const allOk = Object.values(statusMap).every((s) => s === 200);
  if (!allOk) {
    return NextResponse.json({ ok: false, error: "packet_inputs_unavailable", statuses: statusMap }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    packetVersion: "v1",
    packet: {
      summary: summary.json,
      incidents: incidents.json,
      runbook: runbook.json,
      handoff: handoff.json,
      markdown: markdown.json,
    },
  });
}
