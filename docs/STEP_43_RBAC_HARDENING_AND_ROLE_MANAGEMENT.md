# Step 43 — RBAC Hardening, Validation, and Role Management

Date: 2026-02-23

## Delivered
- Added announcement input validation (title/body limits, audience validation).
- Added announcement publish cooldown guard (`FLOCK_ANNOUNCEMENT_COOLDOWN_MINUTES`, default 2).
- Added event input validation (title/description/location/date validity and ordering).
- Added event create cooldown guard (30 seconds per author/church).
- Added member listing endpoint: `GET /api/flock/members`.
- Added role assignment endpoint: `PATCH /api/flock/members/:membershipId/role` (church_admin only).
- Added self-demotion protection for church_admin role assignment.
- Expanded `/flock/admin` with Role Management UI.
- Updated env docs with Flock publish cooldown key.

## Security posture
- Role assignment now requires church-admin and church scope match.
- Role updates are denied across church boundaries.
- Publisher endpoints enforce role checks and structured validation.

## Remaining (next)
- Apply Step 41 migration in live environments and run schema verification.
- Add server-side pagination for members/events/announcements lists.
- Add audit trail for role-change actions.
