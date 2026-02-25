# Mobile + AWS + Wild Beta Execution Plan (200-500 Users)

## Objective
Ship a mobile-ready product, run a controlled public beta on AWS, and collect enough real usage proof to support fundraising.

## Timebox
- Target: **10-14 weeks**
- Aggressive: 6-8 weeks
- Conservative: 16-20 weeks

## Non-Negotiable Launch Gates
1. Crash-free sessions >= 99.0%
2. P95 API latency < 700ms on core flows
3. Authentication + session reliability stable for 7 days
4. Moderation queue and abuse reporting operational
5. Observability + on-call alerting live before opening to 200+ users

---

## Phase 1 (Weeks 1-3): Mobile Core Parity
### Scope
- Auth/onboarding parity
- Feed, prayer, groups, events, messages core UX
- Role-aware navigation and permissions

### Deliverables
- Mobile UI shell complete
- Message thread + send workflow functional
- Onboarding completion gate per role

### Exit Criteria
- Internal dogfood: 20-30 users
- No blocker-level auth or data corruption bugs

---

## Phase 2 (Weeks 4-6): AWS Production Readiness
### Scope
- Deploy application stack to AWS (ECS/Fargate or Amplify)
- Managed data layer + backups
- Secrets, CI/CD, rollout + rollback controls
- Runtime monitoring + alerts

### Deliverables
- Repeatable deploy pipeline (main -> staging -> prod)
- Error tracking and dashboards
- Backup/restore runbook tested

### Exit Criteria
- 2 clean production-like rehearsal deploys
- Incident response drill completed

---

## Phase 3 (Weeks 7-9): Closed Alpha
### Scope
- Invite 25-75 users
- Instrument activation, retention, and friction points
- Tight defect turnarounds

### Deliverables
- Weekly KPI review cadence
- Top 10 friction fixes shipped
- Onboarding + messaging conversion improvements

### Exit Criteria
- Week-1 retention trend is stable/improving
- Support load manageable with existing team

---

## Phase 4 (Weeks 10-14): Public Beta Ramp
### Scope
- Ramp to 200-500 users
- Expand church cohorts
- Validate reliability under real traffic

### Deliverables
- Public beta operating playbook
- KPI evidence pack (activation, retention, engagement)
- Fundraising proof narrative from real usage

### Exit Criteria
- 2-3 weeks stable beta operations
- Metrics and testimonials sufficient for raise conversation

---

## Weekly KPI Minimum Set
- Sign-up completion rate
- D1 / D7 retention
- Messages sent per active user
- Prayer/events engagement rate
- Moderation volume + resolution time
- Crash-free sessions

## Decision Rules
- If crash-free < 99% for 2 consecutive days -> pause cohort expansion
- If D7 retention misses target by >20% -> ship retention sprint before adding users
- If moderation SLA misses for >48h -> freeze growth and add ops capacity

## Immediate Next Execution Block
1. Ship messages live thread + send flow polish
2. Add role-aware onboarding completion prompts
3. Stand up AWS environment checklist and infra owner matrix
