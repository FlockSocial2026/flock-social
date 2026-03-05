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

const runId = `step1053-${Date.now()}`;
const createdUsers = [];
const createdChurchIds = [];

async function createUser(tag) {
  const email = `${runId}-${tag}@example.com`;
  const password = `Temp-${runId}-${tag}!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser failed (${tag}): ${error?.message || "unknown"}`);
  createdUsers.push(data.user.id);
  return { id: data.user.id, email, password };
}

async function cleanup() {
  if (createdChurchIds.length) {
    await admin.from("church_memberships").delete().in("church_id", createdChurchIds);
    await admin.from("churches").delete().in("id", createdChurchIds);
  }
  for (const userId of createdUsers) await admin.auth.admin.deleteUser(userId);
}

(async () => {
  try {
    const churchAdmin = await createUser("church-admin");
    const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email: churchAdmin.email, password: churchAdmin.password });
    if (signInErr || !signIn.session?.access_token) throw new Error(`signIn failed: ${signInErr?.message || "missing token"}`);
    const token = signIn.session.access_token;

    const { data: church, error: churchErr } = await admin
      .from("churches")
      .insert({ name: `Step1053 Church ${runId}`, slug: `${runId}-church` })
      .select("id")
      .single();
    if (churchErr || !church) throw new Error(`church insert failed: ${churchErr?.message || "unknown"}`);
    createdChurchIds.push(church.id);

    const { error: membershipErr } = await admin.from("church_memberships").insert({ church_id: church.id, user_id: churchAdmin.id, role: "church_admin" });
    if (membershipErr) throw new Error(`membership insert failed: ${membershipErr.message}`);

    const res = await fetch(`${baseUrl}/api/flock/ops-health/report-bundle`, {
      headers: { authorization: `Bearer ${token}`, "user-agent": "step1053-report-bundle-smoke" },
    });
    const json = await res.json();

    const summary = {
      runId,
      status: res.status,
      hasSummaryLine: typeof json?.summaryLine === "string" && json.summaryLine.includes("Ops"),
      hasExecutive: typeof json?.bundle?.executive?.reportText === "string",
      hasHourly: typeof json?.bundle?.hourly?.report === "string",
      hasOvernight: typeof json?.bundle?.overnight?.report === "string",
    };

    if (res.status !== 200 || !summary.hasSummaryLine || !summary.hasExecutive || !summary.hasHourly || !summary.hasOvernight) {
      console.log(JSON.stringify({ summary, json }, null, 2));
      throw new Error("Step1053 report bundle smoke failed assertions");
    }

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await cleanup();
  }
})();
