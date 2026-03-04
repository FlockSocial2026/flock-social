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

  const [summary, incidents, runbook, handoffRes, markdownRes, briefRes] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/summary"),
    fetchJson(req, "/api/flock/ops-health/incidents"),
    fetchJson(req, "/api/flock/ops-health/runbook"),
    fetchJson(req, "/api/flock/ops-health/handoff"),
    fetchJson(req, "/api/flock/ops-health/handoff/markdown"),
    fetchJson(req, "/api/flock/ops-health/daily-brief"),
  ]);

  let handoff = handoffRes;
  if (handoff.status !== 200 && briefRes.status === 200 && runbook.status === 200) {
    const lines = [
      `Headline: ${String(briefRes.json?.headline || "n/a")}`,
      `Critical: ${Number(briefRes.json?.metrics?.critical || 0)} | Warning: ${Number(briefRes.json?.metrics?.warning || 0)} | Incidents: ${Number(briefRes.json?.metrics?.openIncidents || 0)}`,
      `Escalation: ${String(runbook.json?.level || "none")}`,
      ...((Array.isArray(runbook.json?.checklist) ? runbook.json.checklist : []).slice(0, 5).map((c: { type: string; text: string }) => `- [${c.type}] ${c.text}`)),
    ];
    handoff = {
      status: 200,
      json: {
        ok: true,
        generatedAt: new Date().toISOString(),
        handoffText: lines.join("\n"),
        brief: briefRes.json,
        runbook: runbook.json,
      },
    };
  }

  let markdown = markdownRes;
  if (markdown.status !== 200 && handoff.status === 200) {
    const brief = handoff.json?.brief ?? {};
    const rb = handoff.json?.runbook ?? {};
    const checklist = Array.isArray(rb?.checklist) ? rb.checklist : [];
    const md = [
      `# Flock Ops Handoff`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `## Headline`,
      `${String(brief?.headline || "n/a")}`,
      ``,
      `## Metrics`,
      `- Healthy: ${Boolean(brief?.metrics?.healthy)}`,
      `- Critical: ${Number(brief?.metrics?.critical || 0)}`,
      `- Warning: ${Number(brief?.metrics?.warning || 0)}`,
      `- Open incidents: ${Number(brief?.metrics?.openIncidents || 0)}`,
      ``,
      `## Escalation`,
      `- Level: ${String(rb?.level || "none")}`,
      ``,
      `## Checklist`,
      ...checklist.slice(0, 8).map((c: { type: string; text: string }) => `- [${c.type}] ${c.text}`),
    ].join("\n");
    markdown = {
      status: 200,
      json: { ok: true, generatedAt: new Date().toISOString(), markdown: md },
    };
  }

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
