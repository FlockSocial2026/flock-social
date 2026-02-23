# Step 44 — Migration Rollout + Audit Trail + GTM Prep

Date: 2026-02-23

## Delivered
- Added migration `20260223_step44_flock_audit_and_indexes.sql`:
  - `flock_role_audit` table
  - supporting indexes for pagination/perf
- Added schema verification script:
  - `scripts/step44-schema-check.mjs`
  - npm script: `schema:check:step44`
- Added pagination to Flock APIs:
  - `GET /api/flock/announcements`
  - `GET /api/flock/events`
  - `GET /api/flock/members`
- Added role-change audit writes in:
  - `PATCH /api/flock/members/:membershipId/role`
- Added church bootstrap flow:
  - `POST /api/flock/bootstrap` (create church + assign first church_admin)
  - UI entry in `/flock` for bootstrap

## Rollout Plan
1. Apply Step 41 migration in environment
2. Apply Step 44 migration in environment
3. Run `npm run schema:check:step44`
4. Validate API smoke:
   - `/api/flock/church`
   - `/api/flock/members?page=1&pageSize=20`
   - role change update and audit insertion

## Risk Notes
- Bootstrap flow intentionally allows only users without existing church membership.
- Role assignment enforces church scope and prevents self-demotion from church_admin.
- Audit table now required for role-change path (ensure migration applied before heavy admin use).
