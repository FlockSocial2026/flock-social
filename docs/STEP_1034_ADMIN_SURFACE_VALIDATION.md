# Step 1034 — Admin Surface Validation + Operational Polish

## Objective
Validate that admin-facing Flock surfaces are operational with authenticated church-admin context and seeded data.

## Added
- `scripts/step1034-admin-surface-smoke.mjs`
- `npm run verify:step1034`

## What it validates
1. Creates temp authenticated church-admin user.
2. Seeds church + membership + event + conversion snapshot.
3. Calls admin APIs as that user:
   - `POST /api/flock/dispatch-logs`
   - `GET /api/flock/dispatch-logs`
   - `GET /api/flock/conversion-timeline`
4. Asserts seeded event is visible in both dispatch logs and conversion timeline.
5. Cleans up all seeded data and users.

## Result
Step 1034 verification confirms admin dispatch + timeline API surfaces work end-to-end under real auth context.
