# Step 1031 — Supabase Schema/Env Remediation Diagnostic

## Objective
Isolate whether production cron failures are caused by missing schema objects vs. API/auth-only issues.

## Added
- `scripts/step1031-supabase-schema-check.mjs`
- `npm run verify:step1031`

## What it checks
Using `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, it probes these required tables via PostgREST:
- `churches`
- `church_memberships`
- `church_events`
- `event_rsvps`
- `flock_dispatch_logs`
- `flock_event_rsvp_snapshots`

## Current finding
In the current Supabase project, required flock tables are unavailable (404 responses), matching runtime error:
`Could not find the table 'public.church_events' in the schema cache`.

## Required remediation
1. Confirm Vercel is pointed at the intended Supabase project.
2. Ensure base flock migrations and Step 1000+ SQL migrations are applied on that project.
3. Re-run:
   - `npm run verify:step1031`
   - `npm run verify:step1029` (with `CRON_SECRET` + prod base URL)
