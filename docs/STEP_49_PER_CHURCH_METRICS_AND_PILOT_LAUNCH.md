# Step 49 — Per-Church Metrics, Trend Deltas, and Pilot Launch Readiness

Date: 2026-02-23

## Delivered
- Extended `GET /api/metrics/pilot-summary` with optional scope:
  - `?churchId=<uuid>`
- Added trend delta payloads:
  - `churchEvents30d` (current vs prior 30-day window)
  - `churchAnnouncements30d` (current vs prior 30-day window)
  - `eventRsvps7d` (current vs prior 7-day window)
- Upgraded `/flock/admin`:
  - Church-scoped metrics fetch
  - Trend delta rendering
- Added pilot onboarding packet doc for cohort launch.

## API Response Additions
- `scope.churchId`
- `trends.{metric}.current|previous|diff|pct`

## Next
- Add per-church member activity KPIs (WAU by church, retention cohorts)
- Add downloadable pilot packet bundle endpoint
- Add church-level target thresholds and alerting
