# Step 38 — Alert Cooldown/Dedupe + Channel Templates

Date: 2026-02-20

## Delivered

1) Alert cooldown + dedupe guard
- Added persistent alert event log table (`moderation_alert_events`) in Supabase.
- Added alert signature keying (`severity + labels + window`) to detect repeated alerts.
- Added cooldown check before webhook send:
  - default: 60 minutes (`MODERATION_ALERT_COOLDOWN_MINUTES`)
  - duplicate signatures inside cooldown are skipped.

2) Channel-specific payload templates
- Added `MODERATION_ALERT_CHANNEL` support with templates:
  - `generic` (existing JSON payload shape)
  - `slack` (Block Kit style payload with metadata)
  - `discord` (content + embed + severity color)

3) Delivery event persistence
- Successful sends are written to `moderation_alert_events` for dedupe history and auditability.
- If migration is not yet applied, alerts still send and return a dedupe-disabled reason.

## Files
- `src/lib/moderationAlerts.ts`
- `supabase/migrations/20260220_moderation_alert_events.sql`
- `.env.example`

## Verification checklist
- Apply Supabase migration `20260220_moderation_alert_events.sql`.
- Set env vars as needed:
  - `MODERATION_ALERT_WEBHOOK_URL`
  - `MODERATION_ALERT_CHANNEL` (`generic|slack|discord`)
  - `MODERATION_ALERT_COOLDOWN_MINUTES` (optional)
- Trigger `/api/moderation/summary-cron` twice with same alert conditions:
  - first call sends
  - second call inside cooldown returns skipped duplicate reason.
