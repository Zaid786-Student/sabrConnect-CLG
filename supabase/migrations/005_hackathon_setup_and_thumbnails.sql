-- Lets an organizer fully configure a hackathon at publish time (team size,
-- minimum female members per team, community group links shown to students
-- after they register) and attach a thumbnail image to both hackathons and
-- internships. All additive/nullable — existing rows and the existing
-- registration flow keep working exactly as before when these are left
-- blank (the app falls back to the previous fixed defaults / hides the
-- section entirely).
-- Safe to run multiple times (all additive, IF NOT EXISTS).

alter table hackathons
  add column if not exists thumbnail_url text,
  add column if not exists team_size int,
  add column if not exists min_female_members int,
  add column if not exists community_links jsonb default '[]';

alter table internships
  add column if not exists thumbnail_url text;
