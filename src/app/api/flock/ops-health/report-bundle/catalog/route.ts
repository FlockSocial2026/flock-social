import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canPublish, getMyChurchMembership } from "@/lib/flockAuthz";

const FORMATS = [
  { key: "brief", path: "/api/flock/ops-health/report-bundle/brief", description: "Compact one-line status" },
  { key: "markdown", path: "/api/flock/ops-health/report-bundle/markdown", description: "Portable markdown packet" },
  { key: "plain", path: "/api/flock/ops-health/report-bundle/plain", description: "Channel-agnostic plain text" },
  { key: "json", path: "/api/flock/ops-health/report-bundle/json", description: "Canonical machine-readable payload" },
  { key: "slack", path: "/api/flock/ops-health/report-bundle/slack", description: "Slack text + Block Kit" },
  { key: "discord", path: "/api/flock/ops-health/report-bundle/discord", description: "Discord content + embeds" },
  { key: "telegram", path: "/api/flock/ops-health/report-bundle/telegram", description: "Telegram MarkdownV2 payload" },
  { key: "whatsapp", path: "/api/flock/ops-health/report-bundle/whatsapp", description: "WhatsApp bold-label format" },
  { key: "sms", path: "/api/flock/ops-health/report-bundle/sms", description: "SMS compact payload + segments" },
  { key: "signal", path: "/api/flock/ops-health/report-bundle/signal", description: "Signal full text + brief" },
  { key: "imessage", path: "/api/flock/ops-health/report-bundle/imessage", description: "iMessage bubble format" },
  { key: "email", path: "/api/flock/ops-health/report-bundle/email", description: "Email subject/text/html package" },
  { key: "webhook", path: "/api/flock/ops-health/report-bundle/webhook", description: "Signed webhook event envelope" },
];

async function probe(req: NextRequest, path: string) {
  const base = req.nextUrl.origin;
  const res = await fetch(`${base}${path}`, {
    headers: { authorization: req.headers.get("authorization") || "" },
    cache: "no-store",
  });
  return { status: res.status };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (!canPublish(membership.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const checks = await Promise.all(FORMATS.map(async (f) => ({ ...f, ...(await probe(req, f.path)) })));

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    total: checks.length,
    healthy: checks.filter((c) => c.status === 200).length,
    items: checks,
  });
}
