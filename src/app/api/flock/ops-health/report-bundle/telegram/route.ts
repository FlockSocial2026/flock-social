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

function esc(input: string) {
  return input.replace(/[\\_*\[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (!canPublish(membership.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  let [bundleRes, briefRes] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/report-bundle"),
    fetchJson(req, "/api/flock/ops-health/report-bundle/brief"),
  ]);

  if (bundleRes.status !== 200) {
    const summaryRes = await fetchJson(req, "/api/flock/ops-health/summary");
    if (summaryRes.status === 200) {
      const s = summaryRes.json?.status ?? {};
      bundleRes = {
        status: 200,
        json: {
          summaryLine: `Ops ${s.healthy ? "healthy" : "attention"} | critical ${Number(s.criticalCount || 0)} | warning ${Number(s.warningCount || 0)}`,
          bundle: {
            executive: { headline: "Fallback executive", reportText: "Fallback executive" },
            hourly: { report: "Fallback hourly" },
            overnight: { report: "Fallback overnight" },
          },
        },
      };
    }
  }

  if (briefRes.status !== 200) {
    briefRes = {
      status: 200,
      json: { brief: "Ops update ready.", maxLen: 17 },
    };
  }

  if (bundleRes.status !== 200 || briefRes.status !== 200) {
    return NextResponse.json(
      { ok: false, error: "report_bundle_telegram_unavailable", statuses: { bundle: bundleRes.status, brief: briefRes.status } },
      { status: 500 }
    );
  }

  const bundle = bundleRes.json;
  const exec = bundle?.bundle?.executive ?? {};
  const hourly = bundle?.bundle?.hourly ?? {};
  const overnight = bundle?.bundle?.overnight ?? {};

  const text = [
    "*Flock Ops Report Bundle*",
    "",
    `*Summary:* ${esc(String(bundle?.summaryLine || "n/a"))}`,
    `*Brief:* ${esc(String(briefRes.json?.brief || ""))}`,
    "",
    `*Executive:* ${esc(String(exec?.headline || ""))}`,
    `${esc(String(exec?.reportText || ""))}`,
    "",
    `*Hourly:* ${esc(String(hourly?.report || ""))}`,
    "",
    `*Overnight:* ${esc(String(overnight?.report || ""))}`,
  ].join("\n");

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    parseMode: "MarkdownV2",
    text,
  });
}
