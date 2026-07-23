-- Migration 001: Auto-create profile and default account on user sign-up
-- Run this in the Supabase SQL Editor after applying schema.sql

-- Function: create profile + default account when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create profile row
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  -- Create a default wallet account
  insert into public.accounts (user_id, name, type, starting_balance)
  values (new.id, 'Main Account', 'wallet', 0);

  return new;
end;
$$;

-- Trigger: fire after every new auth.users row
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Back-fill: ensure existing users already have a profile and account
insert into public.profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.accounts (user_id, name, type, starting_balance)
select u.id, 'Main Account', 'wallet', 0
from auth.users u
where not exists (
  select 1 from public.accounts a where a.user_id = u.id
);
