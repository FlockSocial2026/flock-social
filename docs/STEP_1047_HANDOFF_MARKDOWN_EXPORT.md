# Step 1047 — Handoff Markdown Export

## Objective
Add a portable markdown export for shift handoffs.

## Added
- `GET /api/flock/ops-health/handoff/markdown`
  - auth + publish-role protected
  - composes markdown packet from handoff payload:
    - headline
    - metrics
    - escalation level
    - checklist entries
- Admin UI (`/flock/admin`):
  - markdown export preview (expandable) in handoff block
- Smoke test:
  - `scripts/step1047-handoff-markdown-smoke.mjs`
  - `npm run verify:step1047`

## Outcome
Operators can copy/share a standardized markdown handoff packet across chat/docs with no manual formatting.
