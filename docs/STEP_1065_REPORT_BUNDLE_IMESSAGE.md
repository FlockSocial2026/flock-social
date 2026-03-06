# Step 1065 - Report Bundle iMessage Payload

## Objective
Provide iMessage-ready report bundle output with a concise brief + full body bubble format.

## What shipped
- New endpoint: `GET /api/flock/ops-health/report-bundle/imessage`
  - Auth + church-admin authorization enforced.
  - Returns:
    - `bubble` (brief + full body)
    - `brief`
    - `charCount`
  - Includes fallback composition when plain/brief dependencies are transiently unavailable.
- Admin UX:
  - Added iMessage payload preview in `/flock/admin` Unified Report Bundle block.
- Verification automation:
  - Added `scripts/step1065-report-bundle-imessage-smoke.mjs`
  - Added npm command: `npm run verify:step1065`

## Verification command
```bash
npm run verify:step1065
```
