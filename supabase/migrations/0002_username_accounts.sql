-- HOLD! accounts are a username and password, with no email.
-- Run this after 0001. Safe to run more than once.

-- New accounts get their username (and optional name) from sign-up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  wanted text := lower(new.raw_user_meta_data ->> 'username');
begin
  if wanted !~ '^[a-z0-9_]{3,20}$' then
    wanted := null;
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, wanted, nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''))
  on conflict (id) do nothing;
  return new;
exception when unique_violation then
  -- Username already used by a profile: fail sign-up so the app says it is taken.
  raise exception 'username taken';
end $$;

-- A username signs you in, so it can't change once set.
create or replace function public.keep_username() returns trigger
language plpgsql as $$
begin
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'Usernames can''t be changed.';
  end if;
  return new;
end $$;

drop trigger if exists keep_username on public.profiles;
create trigger keep_username
  before update on public.profiles
  for each row execute function public.keep_username();
