create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.follows enable row level security;

drop policy if exists "Authenticated users can read follows" on public.follows;
create policy "Authenticated users can read follows"
on public.follows
for select
to authenticated
using (true);

drop policy if exists "Users can follow as themselves" on public.follows;
create policy "Users can follow as themselves"
on public.follows
for insert
to authenticated
with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow as themselves" on public.follows;
create policy "Users can unfollow as themselves"
on public.follows
for delete
to authenticated
using (auth.uid() = follower_id);
