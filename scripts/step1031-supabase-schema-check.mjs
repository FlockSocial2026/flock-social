#!/usr/bin/env node

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const requiredTables = [
  "churches",
  "church_memberships",
  "church_events",
  "event_rsvps",
  "flock_dispatch_logs",
  "flock_event_rsvp_snapshots",
];

if (!supabaseUrl || !serviceRole) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

function authHeaders() {
  return {
    apikey: serviceRole,
    authorization: `Bearer ${serviceRole}`,
    "user-agent": "step1031-supabase-schema-check",
  };
}

async function checkTable(table) {
  const url = `${supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}?select=*&limit=1`;
  try {
    const res = await fetch(url, { headers: authHeaders() });
    const body = await res.text();
    return { table, status: res.status, body: body.slice(0, 240) };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { table, status: "ERR", body: msg };
  }
}

async function main() {
  console.log("Step 1031 Supabase Schema Check\n");
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  const rows = [];
  for (const table of requiredTables) {
    rows.push(await checkTable(table));
  }

  let allGood = true;
  for (const row of rows) {
    const ok = row.status === 200;
    if (!ok) allGood = false;
    const icon = ok ? "✅" : "❌";
    console.log(`${icon} ${row.table}\tstatus=${row.status}\t${row.body}`);
  }

  if (!allGood) {
    console.log("\nResult: FAILED — required tables are missing/unavailable in this Supabase project.");
    process.exit(1);
  }

  console.log("\nResult: PASSED — required tables are available.");
}

main();
