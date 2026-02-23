# Step 41 — Technical Specification (Flock, Roles, Events, Announcements)

Date: 2026-02-23
Status: Executing
Owner: Danie + ATLAS

## Scope
Implement core platform primitives required for Step 40 product direction:
- Church identity layer (Flock)
- Role-based permissions (Member, Group Leader, Pastor/Staff, Church Admin)
- Church events (admin publish, member RSVP)
- Weekly congregation pushes (announcements)

## Non-Goals (Step 41)
- Full pastor analytics suite (later phase)
- Volunteer/care workflow automation (later phase)
- Prayer Top 100 leaderboard (deferred by design)

## Architecture Slices

### 1) Data Layer
Add canonical tables for:
- churches
- church_memberships
- user_roles (scoped)
- church_announcements
- church_events
- event_rsvps

All write operations use server-side role checks via shared auth utility.

### 2) Access Control (RBAC)
Role hierarchy for church-scoped actions:
- church_admin (highest)
- pastor_staff
- group_leader
- member (default)

Permissions matrix (initial):
- member: read church feed/events, RSVP, post basic member interactions
- group_leader: member permissions + leader group management hooks
- pastor_staff: publish announcements + create/manage events
- church_admin: full church management + role assignment + publish controls

### 3) API Surfaces (v1)
- `GET /api/flock/church` — fetch active church context for current user
- `POST /api/flock/connect` — connect user to church
- `GET /api/flock/announcements` — list church announcements
- `POST /api/flock/announcements` — create weekly push (pastor/admin)
- `GET /api/flock/events` — list church events
- `POST /api/flock/events` — create event (pastor/admin)
- `POST /api/flock/events/:id/rsvp` — RSVP state update (member+)
- `GET /api/flock/roles/me` — role + capability map

### 4) UI Slices
- `/flock` (member-facing church surface)
  - church header/profile
  - announcements stream
  - upcoming events
- `/flock/admin` (staff/admin console)
  - weekly push composer
  - event composer
  - publish history
- Nav integration
  - Flock tab in primary navigation
  - Events discoverable from Flock and global navigation

## Validation Plan
1. Schema migration applies cleanly on local + production
2. RBAC enforced in middleware and route handlers
3. Unauthorized writes return 403
4. Member can read/RSVP, but cannot publish announcements/events
5. Pastor/Admin can publish announcement and create event

## Risks / Mitigations
- Risk: role mismatch between profile and membership
  - Mitigation: single source of truth in church_memberships + explicit capability resolver
- Risk: announcement spam
  - Mitigation: rate limit per church + publish cooldown hooks (Step 42)
- Risk: migration drift
  - Mitigation: add schema verification script in Step 42

## Exit Criteria
- DB migrations merged
- API v1 endpoints implemented with RBAC
- Flock + Admin screens scaffolded and functional
- QA checklist updated for role-based testing
