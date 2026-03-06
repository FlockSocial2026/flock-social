# Step 1066 - Report Bundle Canonical JSON Payload

## Objective
Provide a canonical JSON payload endpoint for integrations that need normalized machine-readable report-bundle data.

## What shipped
- New endpoint: `GET /api/flock/ops-health/report-bundle/json`
  - Auth + church-admin authorization enforced.
  - Returns:
    - `brief`
    - `summaryLine`
    - `posture`
    - `bundle`
  - Includes fallback composition when bundle/brief dependencies are transiently unavailable.
- Admin UX:
  - Added canonical JSON payload preview in `/flock/admin` Unified Report Bundle block.
- Verification automation:
  - Added `scripts/step1066-report-bundle-json-smoke.mjs`
  - Added npm command: `npm run verify:step1066`

## Verification command
```bash
npm run verify:step1066
```
