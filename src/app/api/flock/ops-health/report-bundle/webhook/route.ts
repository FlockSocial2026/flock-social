import { createHash } from "crypto";
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

  const [bundleRes, briefRes] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/report-bundle"),
    fetchJson(req, "/api/flock/ops-health/report-bundle/brief"),
  ]);

  if (bundleRes.status !== 200 || briefRes.status !== 200) {
    return NextResponse.json(
      { ok: false, error: "report_bundle_webhook_unavailable", statuses: { bundle: bundleRes.status, brief: briefRes.status } },
      { status: 500 }
    );
  }

  const event = {
    type: "flock.ops.report_bundle.v1",
    generatedAt: new Date().toISOString(),
    summaryLine: String(bundleRes.json?.summaryLine || ""),
    posture: bundleRes.json?.posture || {},
    brief: String(briefRes.json?.brief || ""),
    bundle: bundleRes.json?.bundle || {},
  };

  const canonical = JSON.stringify(event);
  const signature = createHash("sha256").update(canonical).digest("hex");

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    headers: {
      "content-type": "application/json",
      "x-flock-event-type": event.type,
      "x-flock-event-signature-sha256": signature,
    },
    payload: event,
  });
}
