# Step 1063 - Report Bundle SMS Payload

## Objective
Provide an SMS-safe compact report payload with segment estimation for carrier-aware send workflows.

## What shipped
- New endpoint: `GET /api/flock/ops-health/report-bundle/sms`
  - Auth + church-admin authorization enforced.
  - Returns:
    - `sms` compact text
    - `charCount`
    - `segmentsEstimate` (160-char baseline)
  - Includes fallback composition from summary + next-actions when brief is unavailable.
- Admin UX:
  - Added SMS payload preview in `/flock/admin` Unified Report Bundle block.
- Verification automation:
  - Added `scripts/step1063-report-bundle-sms-smoke.mjs`
  - Added npm command: `npm run verify:step1063`

## Verification command
```bash
npm run verify:step1063
```
