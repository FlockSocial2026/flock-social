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

  const [escalations, nextActions] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/escalations"),
    fetchJson(req, "/api/flock/ops-health/next-actions"),
  ]);

  if (escalations.status !== 200 || nextActions.status !== 200) {
    return NextResponse.json({ ok: false, error: "runbook_inputs_unavailable" }, { status: 500 });
  }

  const level = String(escalations.json?.level || "none") as "none" | "watch" | "escalate";
  const protocol = Array.isArray(escalations.json?.protocol) ? escalations.json.protocol : [];
  const actions = Array.isArray(nextActions.json?.items) ? nextActions.json.items : [];

  const checklist = [
    ...protocol.map((item: string, idx: number) => ({ id: `protocol_${idx + 1}`, type: "protocol", text: item })),
    ...actions.slice(0, 5).map((item: { action: string }, idx: number) => ({ id: `action_${idx + 1}`, type: "action", text: item.action })),
  ];

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    level,
    checklist,
  });
}
