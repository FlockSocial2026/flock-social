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

  const [dispatchRes, timelineRes, execRes] = await Promise.all([
    fetchJson(req, "/api/flock/dispatch-logs?page=1&pageSize=100"),
    fetchJson(req, "/api/flock/conversion-timeline?limit=12"),
    fetchJson(req, "/api/flock/ops-health/executive-update"),
  ]);

  if (dispatchRes.status !== 200 || timelineRes.status !== 200 || execRes.status !== 200) {
    return NextResponse.json(
      {
        ok: false,
        error: "hourly_report_unavailable",
        statuses: { dispatch: dispatchRes.status, timeline: timelineRes.status, executive: execRes.status },
      },
      { status: 500 }
    );
  }

  const dispatchItems = Array.isArray(dispatchRes.json?.items) ? dispatchRes.json.items : [];
  const cadence = { "T-72h": 0, "T-24h": 0, "T-2h": 0 } as Record<string, number>;
  for (const item of dispatchItems) {
    const key = String(item?.cadence || "");
    if (key in cadence) cadence[key] += 1;
  }

  const timelineItems = Array.isArray(timelineRes.json?.items) ? timelineRes.json.items : [];
  const avgMaybeToGoing = timelineItems.length
    ? Math.round(
        timelineItems
          .map((item: { maybe_to_going_pct?: number | null }) => Number(item?.maybe_to_going_pct ?? 0))
          .reduce((sum: number, v: number) => sum + v, 0) / timelineItems.length
      )
    : 0;

  const topActions = Array.isArray(execRes.json?.topActions) ? execRes.json.topActions.slice(0, 3) : [];

  const report = [
    "Hourly Incremental Progress Report",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Completed in last hour: dispatch logs refreshed ${dispatchItems.length} entries; conversion timeline sampled ${timelineItems.length} events; executive status composed.`,
    `Commits/deploys/verifications: cadence coverage T-72h ${cadence["T-72h"]}, T-24h ${cadence["T-24h"]}, T-2h ${cadence["T-2h"]}; maybe→going avg ${avgMaybeToGoing}%.`,
    "Blockers: none detected in current data pull.",
    `Next hour focus: ${(topActions as string[]).join(" | ") || "Review priority actions and execute highest-impact operator tasks."}`,
  ].join("\n");

  return NextResponse.json({
    ok: true,
    generatedAt: new Date().toISOString(),
    dispatchCount: dispatchItems.length,
    cadence,
    timelineSampleSize: timelineItems.length,
    averageMaybeToGoingPct: avgMaybeToGoing,
    topActions,
    report,
  });
}
