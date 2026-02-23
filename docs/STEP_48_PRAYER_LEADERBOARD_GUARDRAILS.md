# Step 48 — Prayer Leaderboard Guardrails (Foundation)

Date: 2026-02-23

## What shipped
- Added disabled-by-default endpoint:
  - `GET /api/prayer/leaderboard`
- Added schema foundation migration:
  - `20260223_step48_prayer_leaderboard_foundation.sql`
- Added env-gate requirement:
  - `PRAYER_LEADERBOARD_ENABLED=true` required to activate endpoint.

## Why disabled by default
Leaderboard mechanics are vulnerable to gaming without anti-abuse controls.

## Required controls before full launch
1. Score rules tied to meaningful actions (not raw spam volume)
2. Per-user/day scoring caps
3. Suspicious pattern detection (bursting, reciprocal loops, automation)
4. Moderation override and score reset tools
5. Transparent fairness policy

## Proposed v1 scoring model (draft)
- Valid prayer request posted: +2 (max 2/day)
- Meaningful prayer follow-up/update: +1 (max 3/day)
- Verified group prayer participation: +1 (max 5/day)
- Duplicate/spam content: 0 and flag

## Launch checklist
- [ ] Implement anti-gaming checks
- [ ] Add moderation controls for leaderboard
- [ ] Run fairness review with pilot cohort
- [ ] Enable `PRAYER_LEADERBOARD_ENABLED`
