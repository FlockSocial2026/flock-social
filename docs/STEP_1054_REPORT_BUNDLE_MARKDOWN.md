# Step 1054 - Report Bundle Markdown Export

## Objective
Provide a portable markdown export for the unified report bundle so operators can copy/share one structured packet.

## What shipped
- New endpoint: `GET /api/flock/ops-health/report-bundle/markdown`
  - Auth + church-admin authorization enforced.
  - Pulls from `/api/flock/ops-health/report-bundle` and renders a structured markdown packet.
- Admin UX:
  - Added markdown export preview inside the Unified Report Bundle block in `/flock/admin`.
- Verification automation:
  - Added `scripts/step1054-report-bundle-markdown-smoke.mjs`
  - Added npm command: `npm run verify:step1054`

## Verification command
```bash
npm run verify:step1054
```
