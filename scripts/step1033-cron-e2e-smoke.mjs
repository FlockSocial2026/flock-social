#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const cronSecret = process.env.CRON_SECRET || "";
const baseUrl = process.env.FLOCK_BASE_URL || "https://flock-social-qtmh.vercel.app";

if (!supabaseUrl || !serviceRole || !cronSecret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or CRON_SECRET.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const runId = `step1033-${Date.now()}`;
const createdUsers = [];
const createdChurchIds = [];
const createdEventIds = [];

async function createUser(tag) {
  const email = `${runId}-${tag}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `Temp-${runId}-${tag}!`,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createUser failed (${tag}): ${error?.message || "unknown"}`);
  createdUsers.push(data.user.id);
  return data.user.id;
}

async function callCron(path) {
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { authorization: `Bearer ${cronSecret}`, "user-agent": "step1033-cron-e2e-smoke" },
  });
  const body = await res.text();
  return { status: res.status, body };
}

async function cleanup() {
  if (createdEventIds.length) {
    await admin.from("event_rsvps").delete().in("event_id", createdEventIds);
    await admin.from("flock_event_rsvp_snapshots").delete().in("event_id", createdEventIds);
    await admin.from("flock_dispatch_logs").delete().in("event_id", createdEventIds);
    await admin.from("church_events").delete().in("id", createdEventIds);
  }
  if (createdChurchIds.length) {
    await admin.from("church_memberships").delete().in("church_id", createdChurchIds);
    await admin.from("church_announcements").delete().in("church_id", createdChurchIds);
    await admin.from("churches").delete().in("id", createdChurchIds);
  }
  for (const userId of createdUsers) {
    await admin.auth.admin.deleteUser(userId);
  }
}

(async () => {
  try {
    const adminUser = await createUser("admin");
    const memberA = await createUser("member-a");
    const memberB = await createUser("member-b");

    const churchSlug = `${runId}-church`;
    const { data: church, error: churchErr } = await admin
      .from("churches")
      .insert({ name: `Step1033 Church ${runId}`, slug: churchSlug, city: "Testville", state: "NY" })
      .select("id")
      .single();
    if (churchErr || !church) throw new Error(`church insert failed: ${churchErr?.message || "unknown"}`);
    createdChurchIds.push(church.id);

    const now = Date.now();
    const event24At = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    const event72At = new Date(now + 72 * 60 * 60 * 1000).toISOString();

    const { data: events, error: eventsErr } = await admin
      .from("church_events")
      .insert([
        {
          church_id: church.id,
          author_user_id: adminUser,
          title: `Step1033 Event T-24 ${runId}`,
          description: "Cron smoke test event",
          starts_at: event24At,
          location: "Hall A",
        },
        {
          church_id: church.id,
          author_user_id: adminUser,
          title: `Step1033 Event T-72 ${runId}`,
          description: "Cron smoke test event",
          starts_at: event72At,
          location: "Hall B",
        },
      ])
      .select("id,title");
    if (eventsErr || !events || events.length < 2) throw new Error(`event insert failed: ${eventsErr?.message || "unknown"}`);

    const event24 = events.find((e) => e.title.includes("T-24"));
    const event72 = events.find((e) => e.title.includes("T-72"));
    if (!event24 || !event72) throw new Error("failed to identify inserted events");
    createdEventIds.push(event24.id, event72.id);

    const { error: rsvpErr } = await admin.from("event_rsvps").insert([
      { event_id: event24.id, user_id: memberA, status: "going" },
      { event_id: event24.id, user_id: memberB, status: "maybe" },
    ]);
    if (rsvpErr) throw new Error(`rsvp insert failed: ${rsvpErr.message}`);

    const snap = await callCron("/api/flock/attendance-snapshot-cron?sinceHours=336");
    const t24 = await callCron("/api/flock/reminder-cron?cadence=T-24h");
    const t72 = await callCron("/api/flock/reminder-cron?cadence=T-72h");

    const { data: dispatchRows, error: dispatchErr } = await admin
      .from("flock_dispatch_logs")
      .select("id,event_id,cadence,created_at")
      .in("event_id", [event24.id, event72.id]);
    if (dispatchErr) throw new Error(`dispatch query failed: ${dispatchErr.message}`);

    const { data: snapshotRows, error: snapshotErr } = await admin
      .from("flock_event_rsvp_snapshots")
      .select("id,event_id,going,maybe,not_going,total,snapshot_at")
      .eq("event_id", event24.id)
      .order("snapshot_at", { ascending: false })
      .limit(1);
    if (snapshotErr) throw new Error(`snapshot query failed: ${snapshotErr.message}`);

    const summary = {
      runId,
      cron: {
        snapshot: snap,
        reminderT24: t24,
        reminderT72: t72,
      },
      dispatchCountForSeededEvents: dispatchRows?.length || 0,
      latestSnapshotForT24Event: snapshotRows?.[0] || null,
    };

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
})();
