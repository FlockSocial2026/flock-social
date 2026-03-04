import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { canPublish, getMyChurchMembership } from "@/lib/flockAuthz";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  const membership = await getMyChurchMembership(auth.user.id);
  if (!membership) return NextResponse.json({ error: "No church membership" }, { status: 403 });
  if (!canPublish(membership.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  return NextResponse.json({
    ok: true,
    guidance: {
      snapshotFreshness: {
        healthyMinutes: 180,
        healthyMeaning: "Snapshots are fresh enough for operator decisions.",
        staleMeaning: "Snapshot data may be outdated. Trigger cron check and verify ingest path.",
      },
      dispatchCoverage: {
        "T-72h": "Early re-engagement reminders for likely no-shows.",
        "T-24h": "Primary reminder wave before event start.",
        "T-2h": "Last-mile reminder targeting maybe attendees.",
      },
      recommendedActions: [
        "If snapshot is stale, run attendance-snapshot cron and check Supabase write path.",
        "If T-24h dispatch is zero with upcoming events, investigate reminder cron schedule/auth.",
        "If maybe audience dispatch is low, trigger targeted follow-up from Messages bridge.",
      ],
    },
    generatedAt: new Date().toISOString(),
  });
}
