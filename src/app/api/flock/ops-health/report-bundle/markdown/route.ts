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

  const bundleRes = await fetchJson(req, "/api/flock/ops-health/report-bundle");
  if (bundleRes.status !== 200) {
    return NextResponse.json({ ok: false, error: "report_bundle_markdown_unavailable", bundleStatus: bundleRes.status }, { status: 500 });
  }

  const bundle = bundleRes.json;
  const exec = bundle?.bundle?.executive ?? {};
  const hourly = bundle?.bundle?.hourly ?? {};
  const overnight = bundle?.bundle?.overnight ?? {};
  const posture = bundle?.posture ?? {};

  const markdown = [
    "# Flock Ops Report Bundle",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Summary: ${String(bundle?.summaryLine || "n/a")}`,
    "",
    "## Posture",
    `- Healthy: ${Boolean(posture.healthy)}`,
    `- Critical: ${Number(posture.critical || 0)}`,
    `- Warning: ${Number(posture.warning || 0)}`,
    `- Open incidents: ${Number(posture.openIncidents || 0)}`,
    `- Runbook level: ${String(posture.runbookLevel || "none")}`,
    "",
    "## Executive Update",
    `${String(exec.headline || "")}`,
    "",
    "```text",
    `${String(exec.reportText || "")}`,
    "```",
    "",
    "## Hourly Report",
    "```text",
    `${String(hourly.report || "")}`,
    "```",
    "",
    "## Overnight Report",
    "```text",
    `${String(overnight.report || "")}`,
    "```",
  ].join("\n");

  return NextResponse.json({ ok: true, generatedAt: new Date().toISOString(), markdown });
}
