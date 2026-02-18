import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), '.env.local');
const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const res = await fetch(`${url}/auth/v1/settings`, {
  headers: {
    apikey: key,
    authorization: `Bearer ${key}`,
  },
});

console.log(`status=${res.status}`);
const text = await res.text();
console.log(text.slice(0, 4000));
