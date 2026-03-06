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

  let [bundleRes, markdownRes] = await Promise.all([
    fetchJson(req, "/api/flock/ops-health/report-bundle"),
    fetchJson(req, "/api/flock/ops-health/report-bundle/markdown"),
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

  if (markdownRes.status !== 200 && bundleRes.status === 200) {
    const b = bundleRes.json;
    markdownRes = {
      status: 200,
      json: {
        markdown: [
          "# Flock Ops Report Bundle",
          "",
          `Summary: ${String(b?.summaryLine || "n/a")}`,
          "",
          `Executive: ${String(b?.bundle?.executive?.reportText || "")}`,
          `Hourly: ${String(b?.bundle?.hourly?.report || "")}`,
          `Overnight: ${String(b?.bundle?.overnight?.report || "")}`,
        ].join("\n"),
      },
    };
  }

  if (bundleRes.status !== 200 || markdownRes.status !== 200) {
    return NextResponse.json(
      { ok: false, error: "report_bundle_email_unavailable", statuses: { bundle: bundleRes.status, markdown: markdownRes.status } },
      { status: 500 }
    );
  }

  const bundle = bundleRes.json;
  const exec = bundle?.bundle?.executive ?? {};
  const hourly = bundle?.bundle?.hourly ?? {};
  const overnight = bundle?.bundle?.overnight ?? {};

  const subject = `[Flock Ops] ${String(bundle?.summaryLine || "Status Update")}`;
  const textBody = [
    "Flock Ops Report Bundle",
    "",
    `Summary: ${String(bundle?.summaryLine || "n/a")}`,
    "",
    "Executive:",
    `${String(exec?.reportText || exec?.headline || "")}`,
    "",
    "Hourly:",
    `${String(hourly?.report || "")}`,
    "",
    "Overnight:",
    `${String(overnight?.report || "")}`,
  ].join("\n");

  const htmlBody = `
    <h1>Flock Ops Report Bundle</h1>
    <p><strong>Summary:</strong> ${String(bundle?.summaryLine || "n/a")}</p>
    <h2>Executive</h2>
    <pre>${String(exec?.reportText || exec?.headline || "")}</pre>
    <h2>Hourly</h2>
    <pre>${String(hourly?.report || "")}</pre>
    <h2>Overnight</h2>
    <pre>${String(overnight?.report || "")}</pre>
  `;

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    subject,
    textBody,
    htmlBody,
    markdown: String(markdownRes.json?.markdown || ""),
  });
}
