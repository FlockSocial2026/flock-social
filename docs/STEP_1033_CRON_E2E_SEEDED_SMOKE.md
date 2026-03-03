# Step 1033 — Cron E2E Seeded Smoke Validation

## Objective
Move beyond schema existence checks and verify cron behavior with seeded realistic data.

## Added
- `scripts/step1033-cron-e2e-smoke.mjs`
- `npm run verify:step1033`

## What the script does
1. Creates temporary auth users via Supabase Admin API.
2. Creates a temporary church.
3. Seeds two events (T-24h and T-72h windows).
4. Seeds RSVP rows for the T-24h event.
5. Calls production cron endpoints with `CRON_SECRET`:
   - attendance snapshot cron
   - reminder cron T-24h
   - reminder cron T-72h
6. Verifies DB effects:
   - dispatch log rows for seeded events
   - snapshot row for seeded RSVP event
7. Cleans up all seeded records and users.

## Result
Execution confirms cron endpoints run successfully against seeded data and write expected DB artifacts.
