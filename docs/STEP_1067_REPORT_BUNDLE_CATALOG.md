# Step 1067 - Report Bundle Format Catalog

## Objective
Provide a discoverable format catalog endpoint so operators/integrations can inspect available report-bundle outputs and health at runtime.

## What shipped
- New endpoint: `GET /api/flock/ops-health/report-bundle/catalog`
  - Auth + church-admin authorization enforced.
  - Returns:
    - list of supported report-bundle formats with path + description
    - per-format probe status
    - aggregate `healthy/total` summary
- Admin UX:
  - Added catalog preview in `/flock/admin` Unified Report Bundle block.
- Verification automation:
  - Added `scripts/step1067-report-bundle-catalog-smoke.mjs`
  - Added npm command: `npm run verify:step1067`

## Verification command
```bash
npm run verify:step1067
```
