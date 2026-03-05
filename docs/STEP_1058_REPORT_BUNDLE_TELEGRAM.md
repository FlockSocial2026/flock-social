# Step 1058 - Report Bundle Telegram Payload

## Objective
Add Telegram-ready report bundle formatting with MarkdownV2 escaping for reliable send-ready output.

## What shipped
- New endpoint: `GET /api/flock/ops-health/report-bundle/telegram`
  - Auth + church-admin authorization enforced.
  - Returns:
    - `parseMode: MarkdownV2`
    - escaped multi-line `text` payload including summary/executive/hourly/overnight blocks.
  - Includes fallback composition paths when bundle/brief dependencies are transiently unavailable.
- Admin UX:
  - Added Telegram payload preview in `/flock/admin` Unified Report Bundle block.
- Verification automation:
  - Added `scripts/step1058-report-bundle-telegram-smoke.mjs`
  - Added npm command: `npm run verify:step1058`

## Verification command
```bash
npm run verify:step1058
```
