# Step 1029 — Live Production Verification Attempt

## Objective
Run live production checks for cron endpoints and related surfaces after Steps 1000-1028.

## Added
- `scripts/step1029-live-verification.mjs`
- `npm run verify:step1029`

## Execution Result
- Live checks against current production deployment returned `401` across tested routes.
- This indicates deployment access protection and/or missing auth path for direct probe traffic.

## Confirmed via Vercel CLI
- Project env vars currently list:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET` is **not present** in listed env vars.

## Blockers
1. Production deployment is not directly probe-accessible from CLI without bypass/session auth.
2. `CRON_SECRET` missing in Vercel env prevents authenticated cron verification.
3. SQL migration application state in production Supabase still requires direct verification.

## Required Follow-through
1. Add `CRON_SECRET` to Vercel (Production, and Preview if needed).
2. Redeploy production.
3. Verify SQL migrations in Supabase:
   - `docs/sql/2026-02-25_flock_dispatch_logs.sql`
   - `docs/sql/2026-02-25_flock_event_rsvp_snapshots.sql`
4. Re-run:
   - `npm run verify:step1029` (optionally with `FLOCK_BASE_URL` + `CRON_SECRET` set)
   - Authenticated cron endpoint probes
