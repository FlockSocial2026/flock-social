# Step 1064 - Report Bundle Signal Payload

## Objective
Provide Signal-ready report output with compact brief + full plain body for rapid secure sharing.

## What shipped
- New endpoint: `GET /api/flock/ops-health/report-bundle/signal`
  - Auth + church-admin authorization enforced.
  - Returns:
    - `text` full message body
    - `brief` concise line
    - `charCount`
  - Includes fallback composition when plain/brief dependencies are transiently unavailable.
- Admin UX:
  - Added Signal payload preview in `/flock/admin` Unified Report Bundle block.
- Verification automation:
  - Added `scripts/step1064-report-bundle-signal-smoke.mjs`
  - Added npm command: `npm run verify:step1064`

## Verification command
```bash
npm run verify:step1064
```
