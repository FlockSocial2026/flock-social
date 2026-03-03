import { NextRequest } from "next/server";

export type CronAuthResult = { ok: true } | { ok: false; status: number; error: string };

export function requireCronSecret(req: NextRequest): CronAuthResult {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return { ok: false, status: 500, error: "CRON_SECRET is not configured" };
  }

  if (!token || token !== cronSecret) {
    return { ok: false, status: 401, error: "Unauthorized cron request" };
  }

  return { ok: true };
}

export function createCronRunMeta(startedAtMs: number) {
  const finishedAtMs = Date.now();
  return {
    runAt: new Date(startedAtMs).toISOString(),
    durationMs: Math.max(0, finishedAtMs - startedAtMs),
  };
}
