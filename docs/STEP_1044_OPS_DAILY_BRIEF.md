# Step 1044 — Ops Daily Brief Layer

## Objective
Provide a concise operator-ready daily brief from ops signal layers.

## Added
- `GET /api/flock/ops-health/daily-brief`
  - auth + publish-role protected
  - composes summary + incidents + next-actions
  - returns:
    - `headline`
    - `metrics` (healthy/critical/warning/open incidents)
    - top prioritized actions
- Admin UI (`/flock/admin`):
  - daily brief card in Ops Health panel
- Smoke test:
  - `scripts/step1044-daily-brief-smoke.mjs`
  - `npm run verify:step1044`

## Outcome
Operators get a fast at-a-glance brief plus immediate action list for daily standup/start-of-day checks.
