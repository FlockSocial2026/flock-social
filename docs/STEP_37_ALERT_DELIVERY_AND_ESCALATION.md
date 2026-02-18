# Step 37 — Alert Delivery + Escalation Routing Baseline

Date: 2026-02-18

## Delivered

1) Alert payload formatter + severity model
- Added `src/lib/moderationAlerts.ts`.
- Converts moderation summary into structured alert payload:
  - severity (`info|warning|critical`)
  - label flags
  - human-readable summary text

2) Webhook delivery for cron-triggered alerts
- Upgraded `/api/moderation/summary-cron`:
  - computes summary
  - evaluates `hasAlert`
  - sends alert to `MODERATION_ALERT_WEBHOOK_URL` when alert flags are active
  - returns delivery status in response

3) Config surfaced for operations
- Updated `.env.example` with:
  - `CRON_SECRET`
  - `MODERATION_ALERT_WEBHOOK_URL`

## Files
- `src/lib/moderationAlerts.ts`
- `src/app/api/moderation/summary-cron/route.ts`
- `.env.example`

## Verification
- Build passes.

## Runtime checklist
- Set `CRON_SECRET` in Vercel project env vars.
- Set `MODERATION_ALERT_WEBHOOK_URL` to Slack/Discord/custom webhook endpoint.
- Confirm hourly cron calls are authorized and webhook delivery responses are successful.

## Next
- Step 38: dedupe/cooldown logic for repeated alerts and channel-specific formatting templates.
