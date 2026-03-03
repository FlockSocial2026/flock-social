#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function log(ok, label, detail = "") {
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ""}`);
}

const requiredFiles = [
  "docs/sql/2026-02-25_flock_dispatch_logs.sql",
  "docs/sql/2026-02-25_flock_event_rsvp_snapshots.sql",
  "src/app/api/flock/attendance-snapshot-cron/route.ts",
  "src/app/api/flock/reminder-cron/route.ts",
  "src/lib/cron.ts",
  "vercel.json",
];

console.log("Step 1028 Infra Parity Check\n");

let ok = true;
for (const file of requiredFiles) {
  const found = exists(file);
  log(found, `Required file: ${file}`);
  if (!found) ok = false;
}

const vercelPath = path.join(root, "vercel.json");
let cronChecksOk = true;
if (fs.existsSync(vercelPath)) {
  try {
    const vercel = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
    const paths = new Set((vercel.crons || []).map((c) => c.path));
    const requiredCronPaths = [
      "/api/flock/attendance-snapshot-cron?sinceHours=336",
      "/api/flock/reminder-cron?cadence=T-72h",
      "/api/flock/reminder-cron?cadence=T-24h",
      "/api/flock/reminder-cron?cadence=T-2h",
    ];
    for (const p of requiredCronPaths) {
      const found = paths.has(p);
      log(found, `Vercel cron path`, p);
      if (!found) cronChecksOk = false;
    }
  } catch (err) {
    cronChecksOk = false;
    log(false, "Parse vercel.json", err instanceof Error ? err.message : String(err));
  }
}
if (!cronChecksOk) ok = false;

const hasCronSecretLocal = Boolean(process.env.CRON_SECRET);
log(hasCronSecretLocal, "Local env CRON_SECRET configured", hasCronSecretLocal ? "present" : "missing (manual production check required)");

console.log("\nManual Production Checks Required:");
console.log("1) Confirm CRON_SECRET exists in Vercel project env.");
console.log("2) Ensure both SQL migrations were applied in production Supabase.");
console.log("3) Call cron endpoints with Bearer CRON_SECRET and confirm ok responses.");

if (!ok) {
  console.error("\nStep 1028 local parity check FAILED.");
  process.exit(1);
}

console.log("\nStep 1028 local parity check PASSED (local artifacts present).");
