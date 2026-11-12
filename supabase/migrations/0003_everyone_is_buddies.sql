-- Everyone on HOLD! is buddies with everyone else.
-- Run this after 0002. Safe to run more than once.

-- Each new climber becomes buddies with every climber already here.
create or replace function public.befriend_everyone() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.buddies (user_a, user_b, requested_by, status)
  select least(new.id, p.id), greatest(new.id, p.id), new.id, 'accepted'
  from public.profiles p
  where p.id <> new.id
  on conflict (user_a, user_b) do update set status = 'accepted';
  return new;
end $$;

drop trigger if exists befriend_everyone on public.profiles;
create trigger befriend_everyone
  after insert on public.profiles
  for each row execute function public.befriend_everyone();

-- Climbers who joined before this: make them all buddies now.
insert into public.buddies (user_a, user_b, requested_by, status)
select a.id, b.id, a.id, 'accepted'
from public.profiles a
join public.profiles b on a.id < b.id
on conflict (user_a, user_b) do update set status = 'accepted';
