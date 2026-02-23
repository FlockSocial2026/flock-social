-- Step 48 foundation (disabled-by-default): prayer leaderboard scoring table

create table if not exists public.prayer_leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null default 0,
  last_score_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_prayer_scores_rank on public.prayer_leaderboard_scores(score desc, updated_at desc);
