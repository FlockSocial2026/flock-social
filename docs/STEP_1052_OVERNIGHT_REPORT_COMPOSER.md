# Step 1052 - Overnight Report Composer

## Objective
Provide a one-call, send-ready overnight full report payload for morning operator handoff.

## What shipped
- New endpoint: `GET /api/flock/ops-health/overnight-report`
  - Auth + church-admin authorization enforced.
  - Aggregates:
    - `/api/flock/ops-health/snapshot`
    - `/api/flock/ops-health/packet`
    - `/api/flock/ops-health/daily-brief`
    - `/api/flock/ops-health/next-actions`
  - Returns:
    - snapshot posture
    - packet version + brief headline
    - prioritized morning actions
    - multiline overnight full report text
  - Includes fallback composition for transient snapshot/packet failures.
- Admin UX:
  - Added **Overnight Full Report (ready to send)** card in `/flock/admin` ops section.
- Verification automation:
  - Added `scripts/step1052-overnight-report-smoke.mjs`
  - Added npm command: `npm run verify:step1052`

## Verification command
```bash
npm run verify:step1052
```
