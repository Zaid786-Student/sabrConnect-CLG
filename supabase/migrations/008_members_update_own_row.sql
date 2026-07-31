-- ============================================================================
-- Fix: profile edits (name/bio/skills) don't show up on your team
-- ============================================================================
--
-- Root cause: the only UPDATE policy on team_members is
--
--   create policy "Leaders manage membership" on team_members for update using (
--     team_id in (select id from teams where leader_id in (select id from profiles where user_id = auth.uid()))
--   );
--
-- which only lets a team's LEADER update rows in their own team (needed for
-- things like transferring leadership). syncMemberProfileEverywhere()
-- (src/context/data/TeamsContext.jsx), called from ProfileSettings.jsx after
-- you save your profile, runs:
--
--   update team_members set name = ..., bio = ..., skills = ... where user_id = <you>
--
-- If you're a regular member (not the leader) of that team, this UPDATE
-- matches zero rows under the existing policy — Postgres/Supabase doesn't
-- error on that, it just silently updates nothing. So your profile changes
-- saved fine, but the team_members snapshot your teammates see never
-- changed. Even team leaders only worked for their own team's row by
-- coincidence (they happen to satisfy the leader check), not because the
-- policy was ever meant to let someone edit their own record.
--
-- Fix: add a second UPDATE policy letting anyone update their OWN
-- team_members row (regardless of whether they're the leader). Postgres
-- combines multiple permissive policies for the same command with OR, so
-- this is additive — "Leaders manage membership" keeps working exactly as
-- before for leader actions on other members (e.g. transferring
-- leadership), and this just adds "you can always update your own row" on
-- top of it.
--
-- How to apply:
--   Supabase Dashboard → SQL Editor → paste this file → Run
-- ============================================================================

drop policy if exists "Members can update their own row" on team_members;
create policy "Members can update their own row" on team_members for update using (
  user_id in (select id from profiles where user_id = auth.uid())
);
