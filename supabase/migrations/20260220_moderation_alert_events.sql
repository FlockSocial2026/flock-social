create table if not exists public.moderation_alert_events (
  id uuid primary key default gen_random_uuid(),
  alert_key text not null,
  severity text not null check (severity in ('info','warning','critical')),
  labels text[] not null default '{}',
  channel text not null default 'generic' check (channel in ('generic','slack','discord')),
  payload jsonb,
  delivered_at timestamptz not null default now()
);

create index if not exists moderation_alert_events_alert_key_delivered_idx
  on public.moderation_alert_events(alert_key, delivered_at desc);
