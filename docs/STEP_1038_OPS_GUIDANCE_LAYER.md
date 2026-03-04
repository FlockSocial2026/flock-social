# Step 1038 — Ops Guidance Layer

## Objective
Add a lightweight operational guidance layer so admins can act faster when health indicators degrade.

## Added
- `GET /api/flock/ops-health/explain`
  - auth + publish-role protected
  - returns operator guidance for:
    - snapshot freshness interpretation
    - cadence coverage meaning
    - recommended next actions
- Admin UI (`/flock/admin`):
  - renders top recommended actions inside Ops Health Snapshot panel
  - shows guidance refresh timestamp
- Smoke test:
  - `scripts/step1038-ops-guidance-smoke.mjs`
  - `npm run verify:step1038`

## Outcome
Ops health now includes context and actionable guidance, not just raw metrics.
