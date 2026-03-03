# Step 1027 — Build Unblock (Suspense Boundaries for Search Params)

## Objective
Resolve Next.js prerender failures caused by `useSearchParams()` being used in client pages without a suspense boundary.

## Changes
- Updated `src/app/events/page.tsx`
  - Split into `EventsPageInner` + wrapper `EventsPage`
  - Wrapped inner page in `<Suspense fallback=...>`
- Updated `src/app/messages/page.tsx`
  - Split into `MessagesPageInner` + wrapper `MessagesPage`
  - Wrapped inner page in `<Suspense fallback=...>`

## Why
Next.js 16 enforces suspense boundaries around hooks like `useSearchParams()` during prerender/static generation.

## Verification
- `npm run build` now passes successfully.
- Previously failing routes now statically generate:
  - `/events`
  - `/messages`
