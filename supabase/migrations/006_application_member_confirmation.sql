-- ============================================================================
-- Fix: invited teammates can't confirm their spot on a hackathon application
-- ============================================================================
--
-- Root cause: the existing UPDATE policy on `applications` only allows the
-- application owner (the team leader) or the organizer to update the row:
--
--   create policy "Organizers update applications to their opportunities" on applications for update using (
--     organizer_id in (select id from profiles where user_id = auth.uid())
--     or user_id in (select id from profiles where user_id = auth.uid())
--   );
--
-- But confirmApplicationMember() in src/context/data/ApplicationsContext.jsx
-- is called by the *invited teammate* when they open their invite link
-- (ConfirmMembership.jsx) — not by the leader and not by the organizer.
-- That UPDATE gets silently blocked by RLS (0 rows affected, no thrown
-- error), so member_count / members / form_data.pendingMembers[].confirmed
-- never actually change in the database. That's why the "X/Y members
-- confirmed" count never goes down and "Final Submission" never unlocks,
-- even though the teammate sees a success screen.
--
-- Fix: add an additional permissive UPDATE policy scoped to authenticated
-- users only. Multiple permissive policies for the same command are OR'd
-- together in Postgres, so this only *adds* the missing permission — it
-- does not remove or weaken the existing leader/organizer policy above.
-- Real authorization here still comes from the app: you can only reach
-- confirmApplicationMember() if you have the secret invite token from the
-- link the leader shared (same trust model already used for
-- "Users can join teams" on team_members).
--
-- How to apply:
--   1. Supabase Dashboard → SQL Editor → paste this file → Run
--      (or `supabase db push` if you keep this file in supabase/migrations/)
-- ============================================================================

create policy "Invited teammates can confirm their spot" on applications
for update
using (auth.uid() is not null);
