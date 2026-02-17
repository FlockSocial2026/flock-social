# MVP Release Checklist

## Core Functionality
- [ ] Signup/Login works (local + production)
- [ ] Onboarding saves username/full_name
- [ ] Feed loads posts
- [ ] Create text post
- [ ] Create image post
- [ ] Like/Unlike works
- [ ] Comment create/edit/delete works
- [ ] Post edit/delete works
- [ ] Follow/Unfollow works
- [ ] For You / Following filter works
- [ ] Notifications created and readable
- [ ] Discover search users/posts works
- [ ] Public profile route `/u/<username>` works
- [ ] Profile settings update works

## Security / Config
- [ ] `.env*` ignored by git
- [ ] `.env.example` exists and has placeholders only
- [ ] Supabase `service_role` key rotated after any exposure
- [ ] Vercel env vars set for Production/Preview
- [ ] Supabase Auth Site URL + Redirect URLs include production

## Production Smoke
- [ ] Login on production URL
- [ ] Create text + image post on production
- [ ] Notifications increment and mark-read works
- [ ] No console errors blocking main flows

## Post-Launch
- [ ] Add custom domain
- [ ] Add basic analytics (Vercel Analytics or equivalent)
- [ ] Set up uptime check
- [ ] Capture first 10 user feedback notes
