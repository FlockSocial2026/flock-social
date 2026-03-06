# Step 1061 - Report Bundle Plain Text Payload

## Objective
Provide a channel-agnostic plain-text report bundle output for universal copy/send workflows.

## What shipped
- New endpoint: `GET /api/flock/ops-health/report-bundle/plain`
  - Auth + church-admin authorization enforced.
  - Returns:
    - `lines` array
    - `text` joined multiline payload
    - `charCount`
  - Includes fallback composition when bundle/brief dependencies are transiently unavailable.
- Admin UX:
  - Added plain-text payload preview + character count in `/flock/admin` Unified Report Bundle block.
- Verification automation:
  - Added `scripts/step1061-report-bundle-plain-smoke.mjs`
  - Added npm command: `npm run verify:step1061`

## Verification command
```bash
npm run verify:step1061
```
