import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('NO_ENV_LOCAL');
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  const k = m[1];
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[k] = v;
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log('MISSING_SUPABASE_KEYS');
  process.exit(1);
}

const supabase = createClient(url, key);
const tables = ['profiles', 'posts', 'post_likes', 'comments', 'follows', 'notifications', 'reports'];

for (const t of tables) {
  const { error, count } = await supabase.from(t).select('*', { count: 'exact', head: true });
  if (error) {
    console.log(`${t}: ERROR: ${error.message}`);
  } else {
    console.log(`${t}: OK (count=${count ?? 'n/a'})`);
  }
}
