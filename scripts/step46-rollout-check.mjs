import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const checks = [
  "churches",
  "church_memberships",
  "church_announcements",
  "church_events",
  "event_rsvps",
  "flock_role_audit",
];

let failed = false;
for (const table of checks) {
  const { error } = await admin.from(table).select("*", { head: true, count: "exact" }).limit(1);
  if (error) {
    console.error(`FAIL ${table}: ${error.message}`);
    failed = true;
  } else {
    console.log(`OK ${table}`);
  }
}

if (failed) process.exit(1);
console.log("Step 46 rollout check passed ✅");
