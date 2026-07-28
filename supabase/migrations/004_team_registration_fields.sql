-- Adds the fields needed for the simplified "Create Team" / "Join Team by
-- code" registration flow: leader contact/identity details on `teams`, a
-- unique join code, and matching contact/identity fields on `team_members`.
-- Safe to run multiple times (all additive, IF NOT EXISTS).

alter table teams
  add column if not exists leader_email text,
  add column if not exists leader_contact text,
  add column if not exists leader_github text,
  add column if not exists leader_linkedin text,
  add column if not exists leader_gender text,
  add column if not exists team_code text;

create unique index if not exists teams_team_code_key on teams (team_code);

alter table team_members
  add column if not exists email text,
  add column if not exists contact text,
  add column if not exists gender text,
  add column if not exists linkedin_url text;
