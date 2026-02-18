# Step 36 — Moderation Summary Cron + Alert Thresholds

Date: 2026-02-18

## Delivered

1) Moderation summary engine
- Added shared summary calculator in `src/lib/moderationSummary.ts`.
- Computes:
  - open/reviewing backlog
  - recent report counts in a rolling window
  - counts by status and target type
  - alert flags from thresholds

2) Moderator summary API
- Added `GET /api/moderation/summary` (moderator-auth protected).
- Supports threshold/window query params:
  - `windowHours`, `openWarn`, `newWarn`, `userWarn`

3) Scheduled cron endpoint
- Added `GET /api/moderation/summary-cron`.
- Protected by Vercel cron bearer secret (`CRON_SECRET`, fallback `MODERATION_CRON_SECRET`).
- Logs summary + `hasAlert` signal for ops tracking.

4) Vercel cron schedule
- Added `vercel.json` cron entry:
  - hourly run against `/api/moderation/summary-cron?...`

5) Moderation UI summary card
- Moderation page now shows a 24h summary card with:
  - backlog
  - recent volume
  - target mix
  - active alert labels

## Files
- `src/lib/moderationSummary.ts`
- `src/app/api/moderation/summary/route.ts`
- `src/app/api/moderation/summary-cron/route.ts`
- `src/app/moderation/page.tsx`
- `vercel.json`

## Verification
- Build passes with Step 36 additions.

## Runtime note
- Ensure `CRON_SECRET` (or `MODERATION_CRON_SECRET`) is set in Vercel env vars so scheduled requests are authorized.
