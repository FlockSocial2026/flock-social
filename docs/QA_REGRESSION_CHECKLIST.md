# QA Regression Checklist

## A) Auth
- [ ] Signup flow reaches onboarding
- [ ] Login routes correctly based on profile completion
- [ ] Logout returns to expected public route
- [ ] Auth callback route handles token exchange without error

## B) Feed
- [ ] Feed loads without blocking errors
- [ ] Create text post
- [ ] Create image post
- [ ] Edit post
- [ ] Delete post

## C) Engagement
- [ ] Like/unlike post
- [ ] Add comment
- [ ] Edit comment
- [ ] Delete comment
- [ ] Follow/unfollow user

## D) Notifications
- [ ] Notification created for like/comment/follow actions
- [ ] Notification dedupe behavior is correct
- [ ] Mark-read works

## E) Discovery & Profiles
- [ ] Discover returns expected users/posts
- [ ] Public profile `/u/<username>` loads
- [ ] Profile settings save correctly

## F) Moderation/Cron Baseline
- [ ] `/api/health` returns OK
- [ ] `/api/health/db` returns OK
- [ ] `/api/moderation/summary-cron` unauthorized request returns 401
- [ ] Authorized summary-cron request returns structured response

## G) Final Gate
- [ ] No blocking console/runtime errors on critical paths
- [ ] Results captured in QA run log template
