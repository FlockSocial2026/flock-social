# Step 1060 - Report Bundle Webhook Event Payload

## Objective
Provide a webhook-ready event envelope so external automation can ingest report bundle updates with integrity metadata.

## What shipped
- New endpoint: `GET /api/flock/ops-health/report-bundle/webhook`
  - Auth + church-admin authorization enforced.
  - Returns:
    - event headers map (`x-flock-event-type`, `x-flock-event-signature-sha256`)
    - canonical JSON payload with bundle + brief context
  - Uses SHA-256 hash signature over canonical payload for downstream integrity checks.
- Admin UX:
  - Added webhook payload preview in `/flock/admin` Unified Report Bundle block.
- Verification automation:
  - Added `scripts/step1060-report-bundle-webhook-smoke.mjs`
  - Added npm command: `npm run verify:step1060`

## Verification command
```bash
npm run verify:step1060
```
