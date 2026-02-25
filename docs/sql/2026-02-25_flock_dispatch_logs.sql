-- flock dispatch logs table for reminder operations
create table if not exists public.flock_dispatch_logs (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  event_id uuid null references public.church_events(id) on delete set null,
  event_title text not null,
  audience text not null,
  cadence text not null check (cadence in ('T-72h','T-24h','T-2h')),
  created_at timestamptz not null default now()
);

create index if not exists flock_dispatch_logs_church_created_idx
  on public.flock_dispatch_logs (church_id, created_at desc);

alter table public.flock_dispatch_logs enable row level security;

-- API uses service-role key; keep table private from direct client access by default.
