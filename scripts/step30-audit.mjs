#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks = [
  { type: "file", label: "src/lib/supabase.ts", p: "src/lib/supabase.ts" },
  { type: "file", label: "src/app/auth/login/page.tsx", p: "src/app/auth/login/page.tsx" },
  { type: "file", label: "src/app/auth/signup/page.tsx", p: "src/app/auth/signup/page.tsx" },
  { type: "file", label: "src/app/onboarding/page.tsx", p: "src/app/onboarding/page.tsx" },
  { type: "file", label: "src/app/dashboard/page.tsx", p: "src/app/dashboard/page.tsx" },
  { type: "file", label: "src/app/feed/page.tsx", p: "src/app/feed/page.tsx" },
  { type: "file", label: "src/app/notifications/page.tsx", p: "src/app/notifications/page.tsx" },
  { type: "file", label: "src/app/discover/page.tsx", p: "src/app/discover/page.tsx" },
  { type: "file", label: "src/app/settings/profile/page.tsx", p: "src/app/settings/profile/page.tsx" },
  { type: "file", label: "src/app/u/[username]/page.tsx", p: "src/app/u/[username]/page.tsx" },
  { type: "file", label: "src/app/reports/page.tsx", p: "src/app/reports/page.tsx" },
  { type: "file", label: "src/components/ReportButton.tsx", p: "src/components/ReportButton.tsx" },
  { type: "file", label: ".env.example", p: ".env.example" },
  { type: "file", label: "docs/MVP_RELEASE_CHECKLIST.md", p: "docs/MVP_RELEASE_CHECKLIST.md" },
  { type: "file", label: "docs/STEP_30_CLOSEOUT.md", p: "docs/STEP_30_CLOSEOUT.md" },
  { type: "file", label: "supabase/migrations/20260217_init_profiles_rls.sql", p: "supabase/migrations/20260217_init_profiles_rls.sql" },
  { type: "file", label: "supabase/migrations/20260217_posts_table_rls.sql", p: "supabase/migrations/20260217_posts_table_rls.sql" },
  { type: "file", label: "supabase/migrations/20260217_post_likes_rls.sql", p: "supabase/migrations/20260217_post_likes_rls.sql" },
  { type: "file", label: "supabase/migrations/20260217_comments_rls.sql", p: "supabase/migrations/20260217_comments_rls.sql" },
  { type: "file", label: "supabase/migrations/20260217_follows_rls.sql", p: "supabase/migrations/20260217_follows_rls.sql" },
  { type: "file", label: "supabase/migrations/20260217_notifications_rls.sql", p: "supabase/migrations/20260217_notifications_rls.sql" },
  { type: "file", label: "supabase/migrations/20260217_posts_image_storage.sql", p: "supabase/migrations/20260217_posts_image_storage.sql" },
  { type: "file", label: "supabase/migrations/20260217_reports_moderation.sql", p: "supabase/migrations/20260217_reports_moderation.sql" },
];

const exists = (p) => fs.existsSync(path.join(root, p));

let pass = 0;
let fail = 0;

console.log("\n=== Flock Step 30 Audit ===\n");
for (const c of checks) {
  const ok = exists(c.p);
  if (ok) {
    pass++;
    console.log(`✅ ${c.label}`);
  } else {
    fail++;
    console.log(`❌ ${c.label}`);
  }
}

const gitignorePath = path.join(root, ".gitignore");
if (fs.existsSync(gitignorePath)) {
  const gi = fs.readFileSync(gitignorePath, "utf8");
  const hasEnvIgnore = /^\.env\*/m.test(gi);
  const keepsTemplate = /^!\.env\.example$/m.test(gi);
  console.log(`\n${hasEnvIgnore ? "✅" : "❌"} .gitignore ignores .env*`);
  console.log(`${keepsTemplate ? "✅" : "❌"} .gitignore keeps .env.example tracked`);
  if (hasEnvIgnore) pass++; else fail++;
  if (keepsTemplate) pass++; else fail++;
} else {
  console.log("\n❌ .gitignore not found");
  fail++;
}

console.log(`\nPass: ${pass}`);
console.log(`Fail: ${fail}`);
console.log(fail === 0 ? "\nStatus: READY FOR MANUAL PROD GATES" : "\nStatus: FIX FAILURES BEFORE RELEASE");

process.exitCode = fail === 0 ? 0 : 1;
