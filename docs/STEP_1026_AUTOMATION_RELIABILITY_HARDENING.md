# Step 1026 — Automation Reliability Hardening

## Objective
Improve cron-run reliability and operator visibility for the attendance snapshot + reminder automation stack introduced in Steps 1000-1025.

## Shipped

### 1) Shared cron auth + run metadata utility
- Added `src/lib/cron.ts`:
  - `requireCronSecret(req)` for consistent cron auth handling
  - `createCronRunMeta(startedAtMs)` for standard run timing metadata

### 2) Attendance snapshot cron observability improvements
- Updated `src/app/api/flock/attendance-snapshot-cron/route.ts`:
  - Uses shared cron auth utility
  - Returns structured run metadata (`runAt`, `durationMs`)
  - Adds stage hints on failures (`load_events`, `load_rsvps`, `insert_snapshots`, `runtime`)
  - Adds extra counters (`sinceHours`, `ignoredRsvpRows`) for diagnostics

### 3) Reminder cron performance + diagnostics hardening
- Updated `src/app/api/flock/reminder-cron/route.ts`:
  - Uses shared cron auth utility
  - Replaced per-event duplicate lookup loop with one batched existing-dispatch query
  - Returns stage hints on failures (`load_events`, `load_existing_dispatches`, `insert_dispatches`, `runtime`)
  - Adds operator-facing metrics (`skippedExisting`, `window`, `runAt`, `durationMs`)

## Why this matters
- Faster and more predictable cron execution under larger event volumes.
- Better incident triage when a run fails (clear failing stage + runtime duration).
- Cleaner consistency across cron endpoints.

## Verification Checklist
1. `GET /api/flock/attendance-snapshot-cron` with Bearer `CRON_SECRET`
   - Expect `ok: true` and `runAt`, `durationMs`, `inserted`, `scanned`.
2. `GET /api/flock/reminder-cron?cadence=T-24h` with Bearer `CRON_SECRET`
   - Expect `ok: true` and `inserted`, `skippedExisting`, `window`, `durationMs`.
3. Trigger failure intentionally (invalid token) to verify consistent auth error payload.
