-- Crew features: cheers, a feed of pins, persona changes and finished sessions,
-- and pins shown on buddy profiles.
-- Run this after 0004. Safe to run more than once.

alter table public.profiles add column if not exists pins text[] not null default '{}';

-- Things worth telling your buddies about, besides sends (which come from the log).
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('pin', 'persona', 'session')),
  ref text not null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
create index if not exists events_recent on public.events (created_at desc);
alter table public.events enable row level security;

drop policy if exists "see own and buddies events" on public.events;
create policy "see own and buddies events" on public.events
  for select to authenticated using (user_id = auth.uid() or public.is_buddy(user_id));
drop policy if exists "add own events" on public.events;
create policy "add own events" on public.events
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "remove own events" on public.events;
create policy "remove own events" on public.events
  for delete to authenticated using (user_id = auth.uid());

-- A cheer on a buddy's send or event. `target` is "send:<user>:<climb>" or "event:<id>".
create table if not exists public.cheers (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  target_user uuid not null references auth.users on delete cascade,
  target text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target)
);
create index if not exists cheers_target on public.cheers (target);
create index if not exists cheers_for on public.cheers (target_user, created_at desc);
alter table public.cheers enable row level security;

drop policy if exists "see cheers among buddies" on public.cheers;
create policy "see cheers among buddies" on public.cheers
  for select to authenticated
  using (user_id = auth.uid() or target_user = auth.uid() or public.is_buddy(target_user));
drop policy if exists "cheer a buddy" on public.cheers;
create policy "cheer a buddy" on public.cheers
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_buddy(target_user));
drop policy if exists "take back own cheer" on public.cheers;
create policy "take back own cheer" on public.cheers
  for delete to authenticated using (user_id = auth.uid());
