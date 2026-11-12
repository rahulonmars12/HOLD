-- Climbing personas, shared on the profile so buddies can see them.
-- Run this after 0003. Safe to run more than once.
alter table public.profiles add column if not exists persona text;
alter table public.profiles add column if not exists persona_dash text;
