# Step 41 — UI Route Map

## Primary Navigation
- `/feed` (Home)
- `/discover`
- `/prayer` (new scaffold)
- `/groups`
- `/flock` (new)

Global controls:
- Search bar (global)
- Notifications (`/notifications`)
- Profile (`/settings/profile` + `/u/[username]`)
- Create (`+` entry point)

## New/Updated Routes

### Member-facing
- `/flock`
  - Church summary card
  - Announcement feed
  - Upcoming events list
  - Quick RSVP actions

- `/events` (optional global view)
  - Upcoming events across joined contexts

### Staff/Admin-facing
- `/flock/admin`
  - Weekly push composer
  - Announcement history
  - Event creation form

- `/flock/admin/events`
  - Event list/manage

## Route Guards
- `/flock/admin*` => role in {pastor_staff, church_admin}
- publish API calls => same guard server-side

## UX Notes
- Keep prayer separate from church-announcement feed to preserve intent clarity.
- Surface church announcement cards in inbox/notifications for visibility.
- Add role badge in Flock header for staff/admin users.
