#!/usr/bin/env node

const baseUrl = process.env.FLOCK_BASE_URL || "https://flock-social-qtmh-5j5el1fnc-flocksocial2026s-projects.vercel.app";
const cronSecret = process.env.CRON_SECRET || "";

const checks = [
  { name: "health", path: "/api/health", auth: false },
  { name: "snapshot cron", path: "/api/flock/attendance-snapshot-cron?sinceHours=336", auth: true },
  { name: "reminder cron T-72h", path: "/api/flock/reminder-cron?cadence=T-72h", auth: true },
  { name: "reminder cron T-24h", path: "/api/flock/reminder-cron?cadence=T-24h", auth: true },
  { name: "reminder cron T-2h", path: "/api/flock/reminder-cron?cadence=T-2h", auth: true },
];

function clip(text, max = 180) {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function run() {
  console.log(`Step 1029 Live Verification\nBase URL: ${baseUrl}\n`);

  for (const check of checks) {
    const headers = { "user-agent": "step1029-live-verification" };
    if (check.auth && cronSecret) headers.authorization = `Bearer ${cronSecret}`;

    try {
      const res = await fetch(`${baseUrl}${check.path}`, { headers });
      const body = await res.text();
      console.log(`${res.status}\t${check.name}\t${check.path}\t${clip(body)}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`ERR\t${check.name}\t${check.path}\t${clip(msg)}`);
    }
  }

  console.log("\nInterpretation:");
  console.log("- 401 on all routes likely indicates deployment protection/auth wall.");
  console.log("- 401/500 on cron routes can also indicate missing/invalid CRON_SECRET.");
  console.log("- If CRON_SECRET is unset locally, authenticated cron verification is skipped.");
}

run();
