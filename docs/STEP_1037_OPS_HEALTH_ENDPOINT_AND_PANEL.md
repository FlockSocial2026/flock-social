# Step 1037 — Ops Health Endpoint + Admin Panel

## Objective
Give operators a single health snapshot for reminder operations and timeline freshness.

## Added
- `GET /api/flock/ops-health`
  - auth + membership + publish-role protected
  - returns:
    - snapshot freshness (`latestAt`, `ageMin`, `healthy`)
    - dispatch counts over last 24h (total + cadence + audience)
    - upcoming event counts (next24h, next72h)
- Flock Admin UI panel: **Ops Health Snapshot**
  - snapshot freshness status
  - upcoming events indicators
  - dispatch volume indicators
- Smoke validation:
  - `scripts/step1037-ops-health-smoke.mjs`
  - `npm run verify:step1037`

## Outcome
Operators now get a quick readiness read without drilling into multiple views.
