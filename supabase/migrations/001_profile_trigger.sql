-- Run this in your Supabase SQL editor now — it fixes the
-- "new row violates row-level security policy for table profiles" error
-- on signup, without needing to touch any RLS policy.
--
-- Why: the client used to call .insert() on `profiles` right after
-- auth.signUp(). If email confirmation is required (or the client hasn't
-- picked up the new session yet), that insert runs as an unauthenticated
-- request, so auth.uid() is null and the RLS check correctly rejects it.
--
-- The fix: create the profile from a trigger on auth.users instead. It
-- runs with `security definer` (elevated privileges), so it bypasses RLS
-- entirely and doesn't depend on the client having a session yet. This is
-- the pattern Supabase itself recommends for this exact situation.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    case
      when coalesce(new.raw_user_meta_data->>'role', 'student') = 'organizer' then 'approved'
      else 'pending'
    end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
