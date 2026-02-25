# STEP 923 — Event Reminder Automation Workflow

## Objective
Standardize event reminder and follow-up execution so church admins can consistently improve attendance.

## Operating Cadence

### T-72h
- Export upcoming events view CSV from `/events`
- Identify events with low RSVP totals (< target threshold)
- Trigger reminder draft from Flock Admin attendance panel

### T-24h
- Send follow-up drafts to `maybe` and `not going` cohorts
- Capture response notes in messages thread labels

### T-2h
- Send final short reminder to all `going` + `maybe`
- Confirm location and start time in final message template

## KPI Targets
- RSVP conversion from maybe -> going
- Attendance response rate (total RSVPs / active members)
- No-show reduction versus prior week

## Failure Triggers
- If total RSVP rate < baseline for 2 consecutive events:
  - escalate to pastor/staff for announcement reinforcement
  - add testimonial or reason-to-attend message variant

## Artifacts to Maintain Weekly
- Events CSV exports
- Reminder send log
- Follow-up outcomes summary
- Weekly adjustment notes
