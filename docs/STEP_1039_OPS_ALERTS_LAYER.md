# Step 1039 — Ops Alerts Layer

## Objective
Add explicit alerting semantics on top of ops-health metrics so operators can prioritize quickly.

## Added
- `GET /api/flock/ops-health/alerts`
  - auth + publish-role protected
  - computes alert list from current state:
    - snapshot missing/stale
    - missing T-24h dispatch with upcoming 24h events
    - missing T-72h dispatch with upcoming 72h events
    - fallback `ops_healthy` info alert
- Admin UI (`/flock/admin`):
  - displays alert cards with level, message, and action
  - severity styles (`critical`, `warning`, `info`)
- Smoke test:
  - `scripts/step1039-ops-alerts-smoke.mjs`
  - `npm run verify:step1039`

## Outcome
Ops panel now promotes issues as actionable alerts instead of requiring manual interpretation of raw counters.
