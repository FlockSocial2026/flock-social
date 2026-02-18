# MVP Release Checklist

_Last updated: 2026-02-18 (Step 30 execution pass)_

## Core Functionality
- [x] Signup/Login works (local)
- [x] Onboarding saves username/full_name (local)
- [x] Feed loads posts (local)
- [x] Create text post (local)
- [x] Create image post (local)
- [x] Like/Unlike works (local)
- [x] Comment create/edit/delete works (local)
- [x] Post edit/delete works (local)
- [x] Follow/Unfollow works (local)
- [x] For You / Following filter works (local)
- [x] Notifications created and readable (local)
- [x] Discover search users/posts works (local)
- [x] Public profile route `/u/<username>` works (local)
- [x] Profile settings update works (local)

## Security / Config
- [x] `.env*` ignored by git
- [x] `.env.example` exists and has placeholders only
- [ ] Supabase `service_role` key rotated after any exposure (manual)
- [ ] Vercel env vars set for Production/Preview (manual)
- [ ] Supabase Auth Site URL + Redirect URLs include production (manual)

## Database Migration Verification (must confirm in Supabase project)
- [x] 20260217_init_profiles_rls.sql
- [x] 20260217_posts_table_rls.sql
- [x] 20260217_post_likes_rls.sql
- [x] 20260217_comments_rls.sql
- [x] 20260217_follows_rls.sql
- [x] 20260217_notifications_rls.sql
- [x] 20260217_posts_image_storage.sql
- [x] 20260217_reports_moderation.sql

> Verified via `scripts/prod-gate-db-check.mjs` against live Supabase (all expected tables query successfully).

## Production Smoke
- [x] Public production URL reachable (after unblocking deployment protection)
- [x] Production is on latest MVP commit set (`/reports` now 200 on current production deployment)
- [ ] Login on production URL (authenticated smoke)
- [ ] Create text + image post on production
- [ ] Notifications increment and mark-read works
- [ ] No console errors blocking main flows

## Post-Launch
- [ ] Add custom domain
- [ ] Add basic analytics (Vercel Analytics or equivalent)
- [ ] Set up uptime check
- [ ] Capture first 10 user feedback notes
