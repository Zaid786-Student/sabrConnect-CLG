-- Run this in your Supabase SQL editor.
-- Removes the account-level approval gate: every signup (student, volunteer,
-- organizer) is approved immediately. Approval now only applies to
-- hackathon/internship *applications* (see the `applications` table and
-- Participants.jsx), not to accounts themselves.

-- 1. Unblock anyone already stuck as pending/rejected from earlier testing.
update public.profiles set status = 'approved' where status in ('pending', 'rejected');

-- 2. Update the signup trigger so future accounts are always approved.
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
    'approved'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
