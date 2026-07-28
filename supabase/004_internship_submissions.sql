-- Run this in your Supabase SQL editor.
-- Adds internship-linked project submissions, alongside the existing
-- hackathon-linked ones. Every statement is guarded (if exists / if not
-- exists) so it's safe to run even if your `submissions` table has already
-- been adjusted by an earlier ad-hoc migration (e.g. the one that added
-- `user_id` for individual hackathon submissions).

-- 1. Relax the old hackathon-only constraints so a row can reference
--    an internship instead.
alter table submissions alter column hackathon_id drop not null;
alter table submissions alter column team_id drop not null;

-- 2. Add the columns this needs, if they aren't already there.
alter table submissions add column if not exists user_id uuid references profiles(id) on delete cascade;
alter table submissions add column if not exists internship_id uuid references internships(id) on delete cascade;

-- 3. Every submission must reference exactly one opportunity (a hackathon
--    or an internship, never both, never neither).
alter table submissions drop constraint if exists submissions_opportunity_check;
alter table submissions add constraint submissions_opportunity_check check (
  (hackathon_id is not null and internship_id is null) or
  (internship_id is not null and hackathon_id is null)
);

-- 4. Replace the old single "one per team per hackathon" unique constraint
--    with partial unique indexes covering every valid combination: team or
--    solo, hackathon or internship.
alter table submissions drop constraint if exists submissions_hackathon_id_team_id_key;
drop index if exists submissions_hackathon_id_team_id_key;

create unique index if not exists submissions_hackathon_team_uidx
  on submissions (hackathon_id, team_id) where hackathon_id is not null and team_id is not null;
create unique index if not exists submissions_hackathon_user_uidx
  on submissions (hackathon_id, user_id) where hackathon_id is not null and user_id is not null;
create unique index if not exists submissions_internship_team_uidx
  on submissions (internship_id, team_id) where internship_id is not null and team_id is not null;
create unique index if not exists submissions_internship_user_uidx
  on submissions (internship_id, user_id) where internship_id is not null and user_id is not null;

-- 5. Re-apply RLS policies so they cover internship-linked rows too.
drop policy if exists "Team members and organizer view submissions" on submissions;
create policy "Team members and organizer view submissions" on submissions for select using (
  (team_id is not null and team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid())))
  or (user_id is not null and user_id in (select id from profiles where user_id = auth.uid()))
  or (hackathon_id is not null and hackathon_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid())))
  or (internship_id is not null and internship_id in (select id from internships where organizer_id in (select id from profiles where user_id = auth.uid())))
);

drop policy if exists "Team members create their own submission" on submissions;
create policy "Team members create their own submission" on submissions for insert with check (
  (team_id is not null and team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid())))
  or (user_id is not null and user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Team members and organizer update submission" on submissions;
create policy "Team members and organizer update submission" on submissions for update using (
  (team_id is not null and team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid())))
  or (user_id is not null and user_id in (select id from profiles where user_id = auth.uid()))
  or (hackathon_id is not null and hackathon_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid())))
  or (internship_id is not null and internship_id in (select id from internships where organizer_id in (select id from profiles where user_id = auth.uid())))
);
