# Step 1030 — Hobby Cron Deployment Unblock

## Objective
Unblock production deployment after setting `CRON_SECRET` by resolving Vercel Hobby cron schedule limits.

## What happened
- Production deploy failed because Hobby plan only allows daily cron jobs.
- Existing Flock cron schedules (`*/6` and hourly cadences) exceeded Hobby limits.

## Changes
- Updated `vercel.json` flock cron schedules to daily staggered runs:
  - attendance snapshot: `15 14 * * *`
  - reminder T-72h: `20 14 * * *`
  - reminder T-24h: `25 14 * * *`
  - reminder T-2h: `30 14 * * *`

## Notes
- This is a temporary compatibility mode for Hobby.
- For intended higher-frequency cadence, upgrade to Vercel Pro and restore hourly schedules.
