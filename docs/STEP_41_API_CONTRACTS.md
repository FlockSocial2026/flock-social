# Step 41 — API Contracts (Draft v1)

## Auth Model
All endpoints require authenticated user unless otherwise noted.
Role checks are church-scoped.

## `GET /api/flock/church`
Response 200:
```json
{
  "ok": true,
  "church": {
    "id": "uuid",
    "name": "string",
    "slug": "string",
    "city": "string",
    "state": "string"
  },
  "membership": {
    "role": "member|group_leader|pastor_staff|church_admin"
  }
}
```

## `POST /api/flock/connect`
Request:
```json
{ "churchSlug": "string" }
```
Response 200/201:
```json
{ "ok": true, "connected": true }
```

## `GET /api/flock/announcements`
Response 200:
```json
{ "ok": true, "items": [{ "id": "uuid", "title": "string", "body": "string", "publishedAt": "iso" }] }
```

## `POST /api/flock/announcements`
Role required: pastor_staff or church_admin
Request:
```json
{ "title": "string", "body": "string", "audience": "all|members|leaders" }
```
Response 201:
```json
{ "ok": true, "id": "uuid", "published": true }
```

## `GET /api/flock/events`
Response 200:
```json
{ "ok": true, "items": [{ "id": "uuid", "title": "string", "startsAt": "iso", "location": "string" }] }
```

## `POST /api/flock/events`
Role required: pastor_staff or church_admin
Request:
```json
{
  "title": "string",
  "description": "string",
  "startsAt": "iso",
  "endsAt": "iso",
  "location": "string"
}
```
Response 201:
```json
{ "ok": true, "id": "uuid" }
```

## `POST /api/flock/events/:id/rsvp`
Request:
```json
{ "status": "going|maybe|not_going" }
```
Response 200:
```json
{ "ok": true, "status": "going|maybe|not_going" }
```

## `GET /api/flock/roles/me`
Response 200:
```json
{
  "ok": true,
  "role": "member|group_leader|pastor_staff|church_admin",
  "capabilities": {
    "publishAnnouncements": true,
    "createEvents": true,
    "assignRoles": false
  }
}
```
