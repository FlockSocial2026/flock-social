import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createCronRunMeta, requireCronSecret } from "@/lib/cron";

type EventRow = { id: string; church_id: string; title: string; starts_at: string };

function cadenceWindow(cadence: string) {
  const now = Date.now();
  if (cadence === "T-72h") return { from: now + 71 * 60 * 60 * 1000, to: now + 73 * 60 * 60 * 1000, audience: "not_going" };
  if (cadence === "T-2h") return { from: now + 90 * 60 * 1000, to: now + 150 * 60 * 1000, audience: "maybe" };
  return { from: now + 23 * 60 * 60 * 1000, to: now + 25 * 60 * 60 * 1000, audience: "all" };
}

export async function GET(req: NextRequest) {
  const startedAtMs = Date.now();

  try {
    const auth = requireCronSecret(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error, ...createCronRunMeta(startedAtMs) }, { status: auth.status });
    }

    const cadence = String(req.nextUrl.searchParams.get("cadence") || "T-24h") as "T-72h" | "T-24h" | "T-2h";
    if (!["T-72h", "T-24h", "T-2h"].includes(cadence)) {
      return NextResponse.json({ ok: false, error: "Invalid cadence", ...createCronRunMeta(startedAtMs) }, { status: 400 });
    }

    const window = cadenceWindow(cadence);
    const fromIso = new Date(window.from).toISOString();
    const toIso = new Date(window.to).toISOString();

    const admin = getSupabaseAdmin();
    const { data: events, error: eventsErr } = await admin
      .from("church_events")
      .select("id,church_id,title,starts_at")
      .gte("starts_at", fromIso)
      .lte("starts_at", toIso)
      .order("starts_at", { ascending: true })
      .limit(200);

    if (eventsErr) {
      return NextResponse.json({ ok: false, error: eventsErr.message, stage: "load_events", ...createCronRunMeta(startedAtMs) }, { status: 500 });
    }

    const rows = (events ?? []) as EventRow[];
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, cadence, inserted: 0, skippedExisting: 0, scanned: 0, ...createCronRunMeta(startedAtMs) });
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const eventIds = rows.map((row) => row.id);
    const { data: existingRows, error: existingErr } = await admin
      .from("flock_dispatch_logs")
      .select("event_id")
      .eq("cadence", cadence)
      .in("event_id", eventIds)
      .gte("created_at", dayStart.toISOString());

    if (existingErr) {
      return NextResponse.json({ ok: false, error: existingErr.message, stage: "load_existing_dispatches", ...createCronRunMeta(startedAtMs) }, { status: 500 });
    }

    const existingEventIds = new Set((existingRows ?? []).map((row) => String((row as { event_id: string | null }).event_id || "")).filter(Boolean));

    const inserts: Array<Record<string, string | null>> = [];
    for (const event of rows) {
      if (existingEventIds.has(event.id)) continue;

      inserts.push({
        church_id: event.church_id,
        actor_user_id: null,
        event_id: event.id,
        event_title: event.title,
        audience: window.audience,
        cadence,
      });
    }

    if (inserts.length > 0) {
      const { error: insertErr } = await admin.from("flock_dispatch_logs").insert(inserts);
      if (insertErr) {
        return NextResponse.json({ ok: false, error: insertErr.message, stage: "insert_dispatches", ...createCronRunMeta(startedAtMs) }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      cadence,
      inserted: inserts.length,
      skippedExisting: rows.length - inserts.length,
      scanned: rows.length,
      window: { fromIso, toIso },
      ...createCronRunMeta(startedAtMs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown runtime error";
    return NextResponse.json({ ok: false, error: message, stage: "runtime", ...createCronRunMeta(startedAtMs) }, { status: 500 });
  }
}
