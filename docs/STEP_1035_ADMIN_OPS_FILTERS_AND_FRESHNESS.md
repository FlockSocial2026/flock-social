# Step 1035 — Admin Ops Filters + Freshness Signals

## Objective
Improve operator usability on Flock Admin by adding log filtering and timeline freshness metadata.

## Shipped
- Enhanced `GET /api/flock/dispatch-logs` with optional filters:
  - `cadence` (`T-72h|T-24h|T-2h`)
  - `audience`
  - `from` (ISO datetime)
  - `to` (ISO datetime)
- Added filter echo payload in response (`filters` object) for easier client/debug validation.
- Enhanced `GET /api/flock/conversion-timeline` response with:
  - `generatedAt`
  - `itemCount`
  - existing `source` remains (`snapshot|live|none`)
- Updated Flock Admin UI (`/flock/admin`):
  - dispatch cadence filter
  - dispatch audience filter
  - manual refresh button for ops panels
  - conversion timeline source/freshness label

## Outcome
Operators can now segment dispatch activity quickly and trust timeline freshness/source without guesswork.
