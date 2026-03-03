# Step 1036 — Dispatch Filter Validation Smoke

## Objective
Verify new dispatch log filtering behavior under authenticated church-admin context.

## Added
- `scripts/step1036-dispatch-filter-smoke.mjs`
- `npm run verify:step1036`

## Validation flow
1. Creates temp church-admin user and membership.
2. Seeds event + three dispatch rows with mixed cadence/audience values.
3. Calls:
   - `GET /api/flock/dispatch-logs` (all)
   - `GET /api/flock/dispatch-logs?cadence=T-24h`
   - `GET /api/flock/dispatch-logs?audience=maybe`
4. Asserts:
   - all endpoint status codes are 200
   - seeded rows are present
   - cadence-filtered set contains only `T-24h`
   - audience-filtered set contains only `maybe`
   - API filter echo payloads are returned
5. Cleans up seeded users/data.

## Outcome
Dispatch log filtering is now validated with real auth + data-path behavior.
