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

  let handoff = await fetchJson(req, "/api/flock/ops-health/handoff");

  // Fallback composition path in case the aggregated handoff route is transiently unavailable.
  if (handoff.status !== 200) {
    const [briefRes, runbookRes] = await Promise.all([
      fetchJson(req, "/api/flock/ops-health/daily-brief"),
      fetchJson(req, "/api/flock/ops-health/runbook"),
    ]);

    if (briefRes.status !== 200 || runbookRes.status !== 200) {
      return NextResponse.json(
        {
          ok: false,
          error: "handoff_unavailable",
          statuses: { handoff: handoff.status, brief: briefRes.status, runbook: runbookRes.status },
        },
        { status: 500 }
      );
    }

    handoff = {
      status: 200,
      json: {
        brief: briefRes.json,
        runbook: runbookRes.json,
      },
    };
  }

  const brief = handoff.json?.brief ?? {};
  const runbook = handoff.json?.runbook ?? {};
  const checklist = Array.isArray(runbook?.checklist) ? runbook.checklist : [];

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
    `- Level: ${String(runbook?.level || "none")}`,
    ``,
    `## Checklist`,
    ...checklist.slice(0, 8).map((c: { type: string; text: string }) => `- [${c.type}] ${c.text}`),
  ].join("\n");

  return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), markdown: md });
}
