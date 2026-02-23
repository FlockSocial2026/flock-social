-- Step 41 draft migration: Flock + roles + events + announcements

create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text,
  state text,
  created_at timestamptz not null default now()
);

create table if not exists public.church_memberships (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('member','group_leader','pastor_staff','church_admin')),
  created_at timestamptz not null default now(),
  unique (church_id, user_id)
);

create table if not exists public.church_announcements (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  body text not null,
  audience text not null default 'all' check (audience in ('all','members','leaders')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.church_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.church_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('going','maybe','not_going')),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_church_memberships_user on public.church_memberships(user_id);
create index if not exists idx_announcements_church_published on public.church_announcements(church_id, published_at desc);
create index if not exists idx_events_church_starts on public.church_events(church_id, starts_at asc);
