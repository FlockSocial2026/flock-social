# Steps 1000-1025 — Automation Delivery (DB + Cron + Timeline)

## Delivered
- API dispatch ledger endpoints:
  - `GET/POST /api/flock/dispatch-logs`
- Conversion timeline endpoint:
  - `GET /api/flock/conversion-timeline`
  - reads from snapshots when available, falls back to live RSVP aggregation
- Cron endpoints:
  - `GET /api/flock/attendance-snapshot-cron`
  - `GET /api/flock/reminder-cron?cadence=T-72h|T-24h|T-2h`
- Vercel cron schedules added in `vercel.json`.

## Required infra actions (once)
1. Apply SQL migrations:
   - `docs/sql/2026-02-25_flock_dispatch_logs.sql`
   - `docs/sql/2026-02-25_flock_event_rsvp_snapshots.sql`
2. Set `CRON_SECRET` in Vercel project env vars.
3. Redeploy so cron routes/schedules are active.

## Verification checklist
- Call `/api/flock/attendance-snapshot-cron` with Bearer CRON_SECRET -> `ok: true`
- Call `/api/flock/reminder-cron?cadence=T-24h` with Bearer CRON_SECRET -> inserted/scanned counts
- Open Flock Admin -> dispatch log + conversion timeline populated
