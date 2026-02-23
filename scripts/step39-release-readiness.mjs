import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const requiredFiles = [
  'docs/STEP_39_PRODUCTION_VERIFICATION_AND_RELEASE_HARDENING.md',
  'docs/BRANCH_RELEASE_STRATEGY.md',
  'docs/QA_REGRESSION_CHECKLIST.md',
  'docs/QA_RUN_LOG_TEMPLATE.md',
  'docs/OPERATIONS_MONITORING.md',
]

const missing = requiredFiles.filter((rel) => !fs.existsSync(path.join(root, rel)))

if (missing.length) {
  console.error('Step 39 readiness failed. Missing files:')
  for (const m of missing) console.error(` - ${m}`)
  process.exit(1)
}

const envExamplePath = path.join(root, '.env.example')
if (!fs.existsSync(envExamplePath)) {
  console.error('Step 39 readiness failed: .env.example missing')
  process.exit(1)
}

const envExample = fs.readFileSync(envExamplePath, 'utf8')
const requiredEnvKeys = [
  'CRON_SECRET',
  'MODERATION_ALERT_WEBHOOK_URL',
  'MODERATION_ALERT_CHANNEL',
  'MODERATION_ALERT_COOLDOWN_MINUTES',
]

const missingEnvKeys = requiredEnvKeys.filter((k) => !envExample.includes(`${k}=`))
if (missingEnvKeys.length) {
  console.error('Step 39 readiness failed. Missing env example keys:')
  for (const key of missingEnvKeys) console.error(` - ${key}`)
  process.exit(1)
}

console.log('Step 39 readiness checks passed ✅')
