# Operations & Monitoring

## Health Endpoints
- App health: `/api/health`
- DB health: `/api/health/db`

## Recommended Uptime Checks
Monitor every 60s:
1. `https://<prod-domain>/api/health`
2. `https://<prod-domain>/api/health/db`

Alert if either endpoint fails 2 checks in a row.

## Error Monitoring
- Add Sentry DSN in Vercel env (`SENTRY_DSN`) for frontend+server error traces.
- Minimum baseline target:
  - Health endpoint uptime checks active
  - Release smoke checklist completed per release
  - Error triage owner named for each release window

## Alert Threshold Baseline
- Health endpoint failures: alert after 2 consecutive failures.
- Cron endpoint failures (`/api/moderation/summary-cron`): alert on first 5xx.
- Repeated auth callback failures: investigate if >=3 in 15 minutes.

## Runbook (Quick)
1. Check Vercel deployment status.
2. Check `/api/health`.
3. Check `/api/health/db`.
4. Validate auth flow + feed create path.
5. Validate summary cron endpoint auth + response shape.
6. Review recent `reports` entries for abuse spikes.
7. Log outcome in QA run log template.
