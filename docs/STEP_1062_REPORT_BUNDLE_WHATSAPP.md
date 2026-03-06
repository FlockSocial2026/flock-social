# Step 1062 - Report Bundle WhatsApp Payload

## Objective
Provide WhatsApp-ready report formatting for fast share workflows using bold labels and plain line breaks.

## What shipped
- New endpoint: `GET /api/flock/ops-health/report-bundle/whatsapp`
  - Auth + church-admin authorization enforced.
  - Returns:
    - `text` formatted for WhatsApp
    - `charCount`
  - Includes fallback composition when bundle/brief dependencies are transiently unavailable.
- Admin UX:
  - Added WhatsApp payload preview + character count in `/flock/admin` Unified Report Bundle block.
- Verification automation:
  - Added `scripts/step1062-report-bundle-whatsapp-smoke.mjs`
  - Added npm command: `npm run verify:step1062`

## Verification command
```bash
npm run verify:step1062
```
