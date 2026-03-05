# Step 1049 — Ops Snapshot Card

## Objective
Provide a compact one-line ops snapshot for quick glance/read-out.

## Added
- `GET /api/flock/ops-health/snapshot`
  - auth + publish-role protected
  - composes from canonical packet
  - returns compact metrics + `compactText` summary line
- Admin UI (`/flock/admin`):
  - renders compact snapshot text in handoff area
- Smoke test:
  - `scripts/step1049-ops-snapshot-smoke.mjs`
  - `npm run verify:step1049`

## Outcome
Operators can quickly read ops posture in one line without parsing full packet details.
