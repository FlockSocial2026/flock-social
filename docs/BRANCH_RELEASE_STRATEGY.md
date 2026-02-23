# Branch & Release Strategy

## Canonical Branches
- `main`: stable release baseline (production-intent branch)
- `master`: active integration branch currently in use

## Current Rule (Transitional)
Until branch naming migration is completed:
1. Implement on `master`
2. Validate build + smoke checks
3. Sync `master` -> `main` at each release checkpoint

## Target State
Move to single primary branch (`main`) once team workflow migration is complete.

## Release Checklist (Minimum)
1. `npm run build`
2. `npm run readiness:step39`
3. QA smoke checklist execution and run log saved
4. Push `master`
5. Sync to `main`
6. Verify production health endpoints

## Rollback Rule
If production regression is detected:
- Revert to last known good commit on `main`
- Re-run smoke checklist on rollback deployment
- Log incident summary in changelog
