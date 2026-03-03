#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const baseUrl = process.env.FLOCK_BASE_URL || "https://flock-social-qtmh.vercel.app";

if (!supabaseUrl || !anonKey || !serviceRole) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

const runId = `step1034-${Date.now()}`;
const createdUsers = [];
const createdChurchIds = [];
const createdEventIds = [];

async function createUser(tag) {
  const email = `${runId}-${tag}@example.com`;
  const password = `Temp-${runId}-${tag}!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed (${tag}): ${error?.message || "unknown"}`);
  createdUsers.push(data.user.id);
  return { id: data.user.id, email, password };
}

async function api(path, token, method = "GET", body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "step1034-admin-surface-smoke",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, text, json };
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
  for (const userId of createdUsers) await admin.auth.admin.deleteUser(userId);
}

(async () => {
  try {
    const churchAdmin = await createUser("church-admin");

    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({
      email: churchAdmin.email,
      password: churchAdmin.password,
    });
    if (signInErr || !signIn.session?.access_token) {
      throw new Error(`signIn failed: ${signInErr?.message || "missing access token"}`);
    }
    const token = signIn.session.access_token;

    const { data: church, error: churchErr } = await admin
      .from("churches")
      .insert({ name: `Step1034 Church ${runId}`, slug: `${runId}-church`, city: "Testville", state: "NY" })
      .select("id")
      .single();
    if (churchErr || !church) throw new Error(`church insert failed: ${churchErr?.message || "unknown"}`);
    createdChurchIds.push(church.id);

    const { error: membershipErr } = await admin.from("church_memberships").insert({
      church_id: church.id,
      user_id: churchAdmin.id,
      role: "church_admin",
    });
    if (membershipErr) throw new Error(`membership insert failed: ${membershipErr.message}`);

    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: event, error: eventErr } = await admin
      .from("church_events")
      .insert({
        church_id: church.id,
        author_user_id: churchAdmin.id,
        title: `Step1034 Event ${runId}`,
        description: "Admin surface smoke",
        starts_at: startsAt,
        location: "Hall C",
      })
      .select("id,title")
      .single();
    if (eventErr || !event) throw new Error(`event insert failed: ${eventErr?.message || "unknown"}`);
    createdEventIds.push(event.id);

    const { error: snapshotErr } = await admin.from("flock_event_rsvp_snapshots").insert({
      church_id: church.id,
      event_id: event.id,
      going: 3,
      maybe: 1,
      not_going: 0,
      total: 4,
      maybe_to_going_pct: 75,
    });
    if (snapshotErr) throw new Error(`snapshot insert failed: ${snapshotErr.message}`);

    const postDispatch = await api("/api/flock/dispatch-logs", token, "POST", {
      eventId: event.id,
      eventTitle: event.title,
      audience: "all",
      cadence: "T-24h",
    });

    const getDispatch = await api("/api/flock/dispatch-logs?page=1&pageSize=20", token);
    const getTimeline = await api("/api/flock/conversion-timeline?limit=12", token);

    const dispatchHasEvent = Boolean(getDispatch.json?.items?.some((row) => row.event_id === event.id));
    const timelineHasEvent = Boolean(getTimeline.json?.items?.some((row) => row.event_id === event.id));

    const summary = {
      runId,
      postDispatchStatus: postDispatch.status,
      getDispatchStatus: getDispatch.status,
      getTimelineStatus: getTimeline.status,
      dispatchHasSeededEvent: dispatchHasEvent,
      timelineHasSeededEvent: timelineHasEvent,
      timelineSource: getTimeline.json?.source ?? null,
    };

    if (postDispatch.status !== 201 || getDispatch.status !== 200 || getTimeline.status !== 200 || !dispatchHasEvent || !timelineHasEvent) {
      console.log(JSON.stringify({ ...summary, postDispatch, getDispatch, getTimeline }, null, 2));
      throw new Error("Step1034 admin surface smoke failed assertions");
    }

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
})();
