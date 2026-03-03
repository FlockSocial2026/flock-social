# Step 1028 — Infra Parity Verification (1000-1027 Stack)

## Objective
Create a repeatable parity check to reduce drift risk between shipped code (Steps 1000-1027) and production infra state.

## Added
- `scripts/step1028-infra-parity-check.mjs`
  - Verifies required SQL and cron-related source files exist
  - Verifies required cron paths in `vercel.json`
  - Checks local `CRON_SECRET` presence (advisory)
  - Prints mandatory manual production verification checklist
- `package.json` script:
  - `npm run readiness:step1028`

## Run
```bash
npm run readiness:step1028
```

## Manual Production Follow-through
1. Confirm `CRON_SECRET` is set in Vercel env vars.
2. Confirm SQL migrations are applied in production Supabase:
   - `docs/sql/2026-02-25_flock_dispatch_logs.sql`
   - `docs/sql/2026-02-25_flock_event_rsvp_snapshots.sql`
3. Verify cron endpoints with Bearer `CRON_SECRET`:
   - `/api/flock/attendance-snapshot-cron?sinceHours=336`
   - `/api/flock/reminder-cron?cadence=T-72h`
   - `/api/flock/reminder-cron?cadence=T-24h`
   - `/api/flock/reminder-cron?cadence=T-2h`
