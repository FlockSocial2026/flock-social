-- event RSVP snapshots for conversion timeline analytics
create table if not exists public.flock_event_rsvp_snapshots (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  event_id uuid not null references public.church_events(id) on delete cascade,
  snapshot_at timestamptz not null default now(),
  going integer not null default 0,
  maybe integer not null default 0,
  not_going integer not null default 0,
  total integer not null default 0,
  maybe_to_going_pct integer null,
  unique (event_id, snapshot_at)
);

create index if not exists flock_event_rsvp_snapshots_church_snapshot_idx
  on public.flock_event_rsvp_snapshots (church_id, snapshot_at desc);

create index if not exists flock_event_rsvp_snapshots_event_snapshot_idx
  on public.flock_event_rsvp_snapshots (event_id, snapshot_at desc);

alter table public.flock_event_rsvp_snapshots enable row level security;

-- API uses service-role key; keep table private from direct client access by default.
