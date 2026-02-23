# Step 45 — Pilot Readiness & Metrics Instrumentation

Date: 2026-02-23

## Objectives
- Prepare Flock Social for first pilot church cohort (3-5 churches).
- Provide simple measurable KPI outputs for funding conversations.

## Delivered
1. Added pilot metrics endpoint:
   - `GET /api/metrics/pilot-summary`
   - Returns baseline product + church-operating signals.
2. Added pilot execution playbook and checklist.
3. Added KPI definitions aligned to Indiegogo narrative.

## KPI Set (v1)
- profilesTotal
- posts30d
- comments30d
- followEdgesTotal
- churchEvents30d
- churchAnnouncements30d
- eventRsvps7d

## Pilot Success Targets (initial)
- >=3 active pilot churches
- >=40% weekly active members per pilot church
- >=35% event RSVP participation on promoted events
- >=50% weekly announcement read/engagement (proxy via interactions)

## Next Implementation
- Add per-church metric slicing and trend deltas.
- Add admin-facing metrics panel in `/flock/admin`.
- Add export-ready CSV report for backer updates.
