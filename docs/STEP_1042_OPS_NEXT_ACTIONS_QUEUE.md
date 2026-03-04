# Step 1042 — Ops Next-Actions Queue

## Objective
Turn alert/guidance outputs into a prioritized action queue for operators.

## Added
- `GET /api/flock/ops-health/next-actions`
  - auth + publish-role protected
  - composes from:
    - `/api/flock/ops-health/alerts`
    - `/api/flock/ops-health/explain`
  - emits prioritized items:
    - `P0` for critical-alert actions
    - `P1` for warning-alert actions
    - `P2` for general guidance actions
- Admin UI (`/flock/admin`):
  - renders Priority Action Queue cards in Ops panel
- Smoke test:
  - `scripts/step1042-ops-next-actions-smoke.mjs`
  - `npm run verify:step1042`

## Outcome
Operators now have a single ranked to-do list instead of manually translating health/alerts/guidance into actions.
