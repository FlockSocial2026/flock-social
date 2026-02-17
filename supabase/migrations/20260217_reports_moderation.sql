create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','user')),
  target_post_id uuid references public.posts(id) on delete cascade,
  target_comment_id uuid references public.comments(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id) on delete set null,
  resolution_note text
);

create index if not exists reports_status_created_idx on public.reports(status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "Users can create reports as themselves" on public.reports;
create policy "Users can create reports as themselves"
on public.reports
for insert
to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists "Users can read own reports" on public.reports;
create policy "Users can read own reports"
on public.reports
for select
to authenticated
using (auth.uid() = reporter_id);

-- NOTE:
-- Admin moderation updates can be done server-side later with service_role.
-- For now, client can only file/read own reports.
