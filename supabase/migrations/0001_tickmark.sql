-- Tickmark: accounts, cloud sync, buddies, shared gym problems, AI usage.
-- Run this once in the Supabase SQL editor (or with `supabase db push`).

-- Profiles -----------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any signed-in climber can look up a username to add a buddy.
create policy "profiles are readable when signed in" on public.profiles
  for select to authenticated using (true);
create policy "create own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "edit own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Buddies ------------------------------------------------------------------

-- One row per pair, smaller id first, so a pair can only exist once.
create table public.buddies (
  user_a uuid not null references public.profiles on delete cascade,
  user_b uuid not null references public.profiles on delete cascade,
  requested_by uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b))
);

alter table public.buddies enable row level security;

create policy "see own buddy rows" on public.buddies
  for select to authenticated using (auth.uid() in (user_a, user_b));
create policy "send a buddy request" on public.buddies
  for insert to authenticated
  with check (requested_by = auth.uid() and status = 'pending' and auth.uid() in (user_a, user_b));
create policy "accept a request sent to you" on public.buddies
  for update to authenticated
  using (auth.uid() in (user_a, user_b) and auth.uid() <> requested_by)
  with check (status = 'accepted');
create policy "remove a buddy or request" on public.buddies
  for delete to authenticated using (auth.uid() in (user_a, user_b));

create function public.is_buddy(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.buddies
    where status = 'accepted'
      and ((user_a = auth.uid() and user_b = other) or (user_b = auth.uid() and user_a = other))
  );
$$;

-- Synced log tables ----------------------------------------------------------
-- Each row holds the device's object in `data`, plus a few columns for queries.
-- `updated_at` is the device's change time in ms; `synced_at` is server time,
-- used by devices to pull what changed since they last looked.

create function public.tm_stamp() returns trigger
language plpgsql as $$
begin
  -- Last write wins: never overwrite a newer change with an older one.
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end $$;

create table public.sessions (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  data jsonb,
  gym_key text,
  started_at bigint,
  ended_at bigint,
  updated_at bigint not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table public.climbs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  data jsonb,
  gym_key text,
  problem_id text,
  status text,
  sent_at bigint,
  updated_at bigint not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create table public.attempts (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  data jsonb,
  climb_id text,
  updated_at bigint not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

create index sessions_sync on public.sessions (user_id, synced_at);
create index sessions_open on public.sessions (ended_at, started_at);
create index climbs_sync on public.climbs (user_id, synced_at);
create index climbs_problem on public.climbs (problem_id);
create index climbs_sent on public.climbs (sent_at);
create index attempts_sync on public.attempts (user_id, synced_at);
create index attempts_climb on public.attempts (climb_id);

do $$
declare t text;
begin
  foreach t in array array['sessions', 'climbs', 'attempts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.tm_stamp()',
      t || '_stamp', t);
    execute format(
      'create policy "read own and buddies rows" on public.%I for select to authenticated using (user_id = auth.uid() or public.is_buddy(user_id))', t);
    execute format(
      'create policy "write own rows" on public.%I for insert to authenticated with check (user_id = auth.uid())', t);
    execute format(
      'create policy "update own rows" on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format(
      'create policy "delete own rows" on public.%I for delete to authenticated using (user_id = auth.uid())', t);
  end loop;
end $$;

-- Shared gym problems --------------------------------------------------------
-- A problem is one physical climb on a gym wall. Buddies log their own
-- attempts against the same problem so they can compare and share beta.

create table public.problems (
  id text primary key,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  gym_key text not null,
  gym text not null,
  grade int not null,
  color text not null,
  angle text not null,
  holds text[] not null default '{}',
  styles text[] not null default '{}',
  name text,
  photo_path text,
  retired boolean not null default false,
  created_at timestamptz not null default now()
);

create index problems_gym on public.problems (gym_key, retired);

alter table public.problems enable row level security;

create policy "see own and buddies problems" on public.problems
  for select to authenticated using (created_by = auth.uid() or public.is_buddy(created_by));
create policy "add problems" on public.problems
  for insert to authenticated with check (created_by = auth.uid());
create policy "edit own problems" on public.problems
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

-- AI usage, for a daily cap per climber -------------------------------------

create table public.ai_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null,
  at timestamptz not null default now()
);

create index ai_calls_user on public.ai_calls (user_id, at);

alter table public.ai_calls enable row level security;

create policy "see own ai calls" on public.ai_calls
  for select to authenticated using (user_id = auth.uid());
create policy "log own ai calls" on public.ai_calls
  for insert to authenticated with check (user_id = auth.uid());

-- Photos ---------------------------------------------------------------------
-- Stored at photos/<user id>/<climb id>.jpg. Buddies can view each other's.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "upload own photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "replace own photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "view own and buddies photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_buddy(((storage.foldername(name))[1])::uuid)
    )
  );
