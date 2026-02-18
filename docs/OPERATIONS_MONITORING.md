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
- Add Sentry DSN in Vercel env (`SENTRY_DSN`) if you want full frontend+server stack traces.
- Current baseline uses health checks + production smoke checklist.

## Runbook (Quick)
1. Check Vercel deployment status.
2. Check `/api/health`.
3. Check `/api/health/db`.
4. Validate auth flow + feed create path.
5. Review recent `reports` entries for abuse spikes.
