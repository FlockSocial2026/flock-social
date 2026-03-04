# Step 1041 — Ops Incidents View

## Objective
Promote actionable warning/critical issues into an explicit incidents feed for fast triage.

## Added
- `GET /api/flock/ops-health/incidents`
  - derives incident objects from `/api/flock/ops-health/alerts`
  - includes: `id`, `severity`, `summary`, `action`, `acknowledged`
  - returns `openCount` and incident list
- Admin UI (`/flock/admin`):
  - renders open incidents list in Ops panel
  - highlights severity and action per incident
- Smoke test:
  - `scripts/step1041-ops-incidents-smoke.mjs`
  - `npm run verify:step1041`

## Outcome
Operators now see a compact incident feed instead of parsing alerts manually.
