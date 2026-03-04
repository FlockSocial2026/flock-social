# Step 1040 — Ops Summary Aggregator

## Objective
Provide one endpoint that aggregates health, guidance, and alerts for a single operator read.

## Added
- `GET /api/flock/ops-health/summary`
  - auth + publish-role protected
  - internally aggregates:
    - `/api/flock/ops-health`
    - `/api/flock/ops-health/explain`
    - `/api/flock/ops-health/alerts`
  - returns compact status (`healthy`, `criticalCount`, `warningCount`) plus full payloads
- Admin UI (`/flock/admin`):
  - summary line in Ops Health panel:
    - healthy vs attention-needed
    - critical/warning counts
- Smoke test:
  - `scripts/step1040-ops-summary-smoke.mjs`
  - `npm run verify:step1040`

## Outcome
Operators now get a top-level health decision in one read without manually correlating multiple sections.
