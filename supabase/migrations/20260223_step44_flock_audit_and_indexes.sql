-- Step 44: flock audit trail + pagination-support indexes

create table if not exists public.flock_role_audit (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id) on delete cascade,
  membership_id uuid not null references public.church_memberships(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  old_role text not null check (old_role in ('member','group_leader','pastor_staff','church_admin')),
  new_role text not null check (new_role in ('member','group_leader','pastor_staff','church_admin')),
  changed_at timestamptz not null default now()
);

create index if not exists idx_flock_role_audit_church_changed on public.flock_role_audit(church_id, changed_at desc);
create index if not exists idx_flock_role_audit_target on public.flock_role_audit(target_user_id, changed_at desc);

create index if not exists idx_church_memberships_church_created on public.church_memberships(church_id, created_at desc);
create index if not exists idx_church_events_church_created on public.church_events(church_id, created_at desc);
create index if not exists idx_church_announcements_church_created on public.church_announcements(church_id, created_at desc);
