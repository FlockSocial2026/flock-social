# Step 33 — Auth + Trust Hardening

Date: 2026-02-18

## Goals
- Hardening auth redirects and callback handling in production.
- Verifying moderation permissions with explicit API surface.
- Introducing server-side notification digest batching for cleaner UX and future alerts.

## Delivered

1) Auth callback flow
- Added `src/app/auth/callback/page.tsx`.
- Exchanges auth code for session and routes users:
  - to `/onboarding` if profile is incomplete
  - to `/dashboard` otherwise

2) Signup redirect hardening
- Updated signup to pass `emailRedirectTo` dynamically:
  - `${window.location.origin}/auth/callback`
- Aligns with Supabase URL config and prevents stale localhost fallback in production.

3) Login routing improvement
- Login now checks profile existence and routes users to the correct destination.
- Added login success analytics event for baseline auth funnel visibility.

4) Moderation permission verification endpoint
- Added `GET /api/moderation/me`.
- Returns auth status and moderator allowlist signal for operational verification.
- Extracted shared moderation auth logic into `src/lib/moderationAuth.ts`.

5) Notification digest batching API
- Added `GET /api/notifications/digest`.
- Returns unread count + 24h counts by type (`like/comment/follow`).
- Notifications UI now displays a 24h digest summary card.

## Verification
- Build passes with new routes and auth flow updates.

## Notes
- This step complements prior deploy/auth config fixes (Vercel env + Supabase URL config).
- Next recommended step: enforce route-level guards for moderator pages and add audit trail export for moderation actions.
