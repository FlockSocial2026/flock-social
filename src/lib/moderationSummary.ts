import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type SummaryOpts = {
  windowHours?: number;
  openWarn?: number;
  newWarn?: number;
  userWarn?: number;
};

export async function getModerationSummary(opts: SummaryOpts = {}) {
  const windowHours = Math.max(1, Number(opts.windowHours ?? 24));
  const openWarn = Math.max(1, Number(opts.openWarn ?? 25));
  const newWarn = Math.max(1, Number(opts.newWarn ?? 15));
  const userWarn = Math.max(1, Number(opts.userWarn ?? 5));

  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  const { data: recentRows, error: recentErr } = await admin
    .from("reports")
    .select("id,status,target_type,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (recentErr) throw new Error(recentErr.message);

  const { count: openCount, error: openErr } = await admin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .in("status", ["open", "reviewing"]);

  if (openErr) throw new Error(openErr.message);

  const rows = (recentRows ?? []) as { id: string; status: string; target_type: "post" | "comment" | "user"; created_at: string }[];

  const byStatus = { open: 0, reviewing: 0, resolved: 0, dismissed: 0 };
  const byTarget = { post: 0, comment: 0, user: 0 };

  for (const row of rows) {
    if (row.status in byStatus) (byStatus as any)[row.status] += 1;
    if (row.target_type in byTarget) (byTarget as any)[row.target_type] += 1;
  }

  const backlog = (openCount ?? 0);
  const alerts = {
    openBacklogHigh: backlog >= openWarn,
    newReportsSpike: rows.length >= newWarn,
    userReportsSpike: byTarget.user >= userWarn,
  };

  return {
    windowHours,
    generatedAt: new Date().toISOString(),
    backlog,
    recent: {
      total: rows.length,
      byStatus,
      byTarget,
    },
    thresholds: { openWarn, newWarn, userWarn },
    alerts,
  };
}
