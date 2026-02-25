import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type EventRow = { id: string; church_id: string; title: string; starts_at: string };

function cadenceWindow(cadence: string) {
  const now = Date.now();
  if (cadence === "T-72h") return { from: now + 71 * 60 * 60 * 1000, to: now + 73 * 60 * 60 * 1000, audience: "not_going" };
  if (cadence === "T-2h") return { from: now + 90 * 60 * 1000, to: now + 150 * 60 * 1000, audience: "maybe" };
  return { from: now + 23 * 60 * 60 * 1000, to: now + 25 * 60 * 60 * 1000, audience: "all" };
}

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
    }

    const cadence = String(req.nextUrl.searchParams.get("cadence") || "T-24h") as "T-72h" | "T-24h" | "T-2h";
    if (!["T-72h", "T-24h", "T-2h"].includes(cadence)) {
      return NextResponse.json({ error: "Invalid cadence" }, { status: 400 });
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

    if (eventsErr) return NextResponse.json({ error: eventsErr.message }, { status: 500 });

    const rows = (events ?? []) as EventRow[];
    if (rows.length === 0) return NextResponse.json({ ok: true, cadence, inserted: 0, scanned: 0 });

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const inserts: Array<Record<string, string | null>> = [];

    for (const event of rows) {
      const { data: existing, error: existingErr } = await admin
        .from("flock_dispatch_logs")
        .select("id")
        .eq("event_id", event.id)
        .eq("cadence", cadence)
        .gte("created_at", dayStart.toISOString())
        .limit(1)
        .maybeSingle();

      if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });
      if (existing?.id) continue;

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
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, cadence, inserted: inserts.length, scanned: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown runtime error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
