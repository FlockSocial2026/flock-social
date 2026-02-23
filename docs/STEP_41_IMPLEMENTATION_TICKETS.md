# Step 41 — Implementation Tickets

## EPIC A: Schema + RBAC
1. Add migration: `churches`, `church_memberships`, `church_announcements`, `church_events`, `event_rsvps`
2. Add role enum + membership constraints
3. Add shared capability resolver in `src/lib/authz.ts`
4. Add middleware helper for church-scoped role guards

## EPIC B: Flock API v1
5. Implement `GET /api/flock/church`
6. Implement `POST /api/flock/connect`
7. Implement `GET/POST /api/flock/announcements`
8. Implement `GET/POST /api/flock/events`
9. Implement `POST /api/flock/events/:id/rsvp`
10. Implement `GET /api/flock/roles/me`

## EPIC C: Flock UI v1
11. Create `/flock` page scaffold
12. Create announcement stream component
13. Create upcoming events component + RSVP action
14. Add `/flock/admin` page scaffold
15. Add weekly push composer form
16. Add event composer form

## EPIC D: QA + Ops
17. Extend QA checklist with role-based test cases
18. Add Step 41 migration verification script
19. Add docs for church role setup + first admin seed flow

## Suggested Build Order
A1-A4 -> B5-B10 -> C11-C16 -> D17-D19

## Definition of Done
- All endpoints return documented shapes
- Unauthorized role attempts are blocked
- Member and admin experiences both validated
- Build passes and docs updated
