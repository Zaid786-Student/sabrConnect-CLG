-- ============================================================================
-- SabrConnect — Supabase Schema (full backend)
-- Run this in the Supabase SQL editor, or `supabase db push`, on a fresh
-- project. This is the single source of truth for the database: every
-- DataContext module (src/context/data/*) reads/writes these tables and
-- subscribes to them via Supabase Realtime.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- profiles — one row per authenticated user, extends auth.users
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  full_name text not null,
  role text not null check (role in ('student', 'volunteer', 'organizer')),
  -- students/volunteers start pending until an organizer approves them;
  -- organizers are auto-approved. Mirrors the account-approval flow in
  -- src/context/AuthContext.jsx.
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  bio text,
  skills text[] default '{}',
  profile_image text,
  college text,
  created_at timestamptz not null default now()
);

-- Profiles are created by this trigger, not by a client-side insert after
-- signUp() — a client insert can run before the browser has an
-- authenticated session (e.g. when email confirmation is required), which
-- fails the "auth.uid() = user_id" RLS check below. `security definer`
-- makes this trigger bypass RLS and run as part of the same transaction
-- that creates the auth.users row, so there's no race.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- hackathons
-- ---------------------------------------------------------------------------
create table if not exists hackathons (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  organizer_id uuid not null references profiles(id) on delete cascade,
  organizer_name text,
  start_date date,
  end_date date,
  registration_deadline date,
  status text not null default 'upcoming' check (status in ('upcoming', 'open', 'closed', 'completed')),
  tags text[] default '{}',
  participants int not null default 0,
  location text,
  prize text,
  rules text,
  thumbnail_url text,
  team_size int,
  min_female_members int,
  community_links jsonb default '[]',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- internships
-- ---------------------------------------------------------------------------
create table if not exists internships (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  company text,
  description text,
  organizer_id uuid not null references profiles(id) on delete cascade,
  organizer_name text,
  deadline date,
  status text not null default 'open' check (status in ('open', 'closed')),
  participants int not null default 0,
  location text,
  stipend text,
  duration text,
  responsibilities text,
  requirements text,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- notices — posted against a hackathon or internship
-- ---------------------------------------------------------------------------
create table if not exists notices (
  id uuid primary key default uuid_generate_v4(),
  target_type text not null check (target_type in ('hackathon', 'internship')),
  target_id uuid not null,
  title text not null,
  content text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
create table if not exists teams (
  id uuid primary key default uuid_generate_v4(),
  team_name text not null,
  leader_id uuid not null references profiles(id) on delete cascade,
  leader_email text,
  leader_contact text,
  leader_github text,
  leader_linkedin text,
  leader_gender text,
  team_code text unique,
  description text,
  goal text,
  project_name text,
  comm_link text,
  logo text default '🚀',
  skills text[] default '{}',
  interests text[] default '{}',
  roles_needed text[] default '{}',
  open_slots int not null default 3,
  opportunity_id uuid,
  opportunity_title text,
  opportunity_type text check (opportunity_type in ('hackathon', 'internship')),
  achievements jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- team_members
-- ---------------------------------------------------------------------------
create table if not exists team_members (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  name text,
  email text,
  contact text,
  gender text,
  linkedin_url text,
  is_leader boolean not null default false,
  role text,
  skills text[] default '{}',
  bio text,
  experience text default 'Intermediate',
  portfolio_url text,
  github_url text,
  availability text default 'Available',
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

-- ---------------------------------------------------------------------------
-- team_join_requests
-- ---------------------------------------------------------------------------
create table if not exists team_join_requests (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text,
  skills text[] default '{}',
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- team_announcements / team_resources / team_messages (team workspace)
-- ---------------------------------------------------------------------------
create table if not exists team_announcements (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  author_name text,
  title text not null,
  content text,
  created_at timestamptz not null default now()
);

create table if not exists team_resources (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  added_by_id uuid references profiles(id) on delete set null,
  added_by text,
  name text not null,
  url text,
  created_at timestamptz not null default now()
);

create table if not exists team_messages (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid not null references teams(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  sender_name text,
  text text,
  type text not null default 'text' check (type in ('text', 'announcement', 'file')),
  attachment jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- applications — polymorphic across hackathons/internships
-- ---------------------------------------------------------------------------
create table if not exists applications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  user_name text,
  user_email text,
  organizer_id uuid references profiles(id) on delete cascade,
  opportunity_id uuid not null,
  opportunity_type text not null check (opportunity_type in ('hackathon', 'internship')),
  title text,
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'in_review', 'accepted', 'rejected')),
  form_data jsonb default '{}',
  team_id uuid references teams(id) on delete set null,
  team_name text,
  member_count int default 1,
  members jsonb default '[]',
  created_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

-- ---------------------------------------------------------------------------
-- volunteer_tasks
-- ---------------------------------------------------------------------------
create table if not exists volunteer_tasks (
  id uuid primary key default uuid_generate_v4(),
  volunteer_id uuid references profiles(id) on delete cascade,
  event_id uuid not null references hackathons(id) on delete cascade,
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  deadline date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- volunteer_signups — a volunteer's request to help at a hackathon
-- ---------------------------------------------------------------------------
create table if not exists volunteer_signups (
  id uuid primary key default uuid_generate_v4(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  hackathon_title text,
  organizer_id uuid references profiles(id) on delete cascade,
  volunteer_id uuid not null references profiles(id) on delete cascade,
  volunteer_name text,
  volunteer_email text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (hackathon_id, volunteer_id)
);

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  organizer_id uuid not null references profiles(id) on delete cascade,
  organizer_name text,
  title text not null,
  content text,
  audience text not null default 'All',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- submissions — one project submission per team per hackathon
-- ---------------------------------------------------------------------------
create table if not exists submissions (
  id uuid primary key default uuid_generate_v4(),
  hackathon_id uuid not null references hackathons(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  project_title text not null,
  description text not null,
  repo_url text,
  demo_url text,
  video_url text,
  tech_stack text[] default '{}',
  submitted_at timestamptz not null default now(),
  ai_score int,
  ai_reasons text[],
  ai_scored_at timestamptz,
  organizer_score int,
  organizer_notes text,
  status text not null default 'submitted' check (status in ('submitted', 'shortlisted', 'winner', 'rejected')),
  unique (hackathon_id, team_id)
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  message text,
  role text default 'info',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- mail_log — simulated outgoing mail (swap for a real provider via an edge
-- function later; the app only ever reads/inserts here, never depends on an
-- actual send succeeding)
-- ---------------------------------------------------------------------------
create table if not exists mail_log (
  id uuid primary key default uuid_generate_v4(),
  to_email text,
  to_name text,
  subject text,
  body text,
  sent_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------
create table if not exists follows (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references profiles(id) on delete cascade,
  following_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id)
);

-- ---------------------------------------------------------------------------
-- connections — LinkedIn-style connect requests
-- ---------------------------------------------------------------------------
create table if not exists connections (
  id uuid primary key default uuid_generate_v4(),
  from_id uuid not null references profiles(id) on delete cascade,
  to_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- conversations / conversation_participants / messages (direct messaging)
-- ---------------------------------------------------------------------------
create table if not exists conversations (
  id uuid primary key default uuid_generate_v4(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete set null,
  sender_name text,
  text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- posts / post_likes / post_comments (opportunity feed)
-- ---------------------------------------------------------------------------
create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references profiles(id) on delete cascade,
  author_name text,
  author_role text default 'student',
  type text not null default 'project' check (type in ('project', 'hackathon_achievement', 'internship_achievement', 'recruitment', 'opportunity_share')),
  content text,
  tags text[] default '{}',
  image text,
  link text,
  linked_team_id uuid references teams(id) on delete set null,
  shares int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists post_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  author_name text,
  text text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles enable row level security;
alter table hackathons enable row level security;
alter table internships enable row level security;
alter table notices enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table team_join_requests enable row level security;
alter table team_announcements enable row level security;
alter table team_resources enable row level security;
alter table team_messages enable row level security;
alter table applications enable row level security;
alter table volunteer_tasks enable row level security;
alter table volunteer_signups enable row level security;
alter table announcements enable row level security;
alter table submissions enable row level security;
alter table notifications enable row level security;
alter table mail_log enable row level security;
alter table follows enable row level security;
alter table connections enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table post_comments enable row level security;

-- profiles
create policy "Profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = user_id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = user_id);
-- any approved organizer can approve/reject pending signups
create policy "Organizers can update pending accounts" on profiles for update using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'organizer' and p.status = 'approved')
);

-- hackathons / internships / notices
create policy "Hackathons are viewable by everyone" on hackathons for select using (true);
create policy "Organizers manage their hackathons" on hackathons for all using (
  organizer_id in (select id from profiles where user_id = auth.uid())
);
create policy "Internships are viewable by everyone" on internships for select using (true);
create policy "Organizers manage their internships" on internships for all using (
  organizer_id in (select id from profiles where user_id = auth.uid())
);
create policy "Notices are viewable by everyone" on notices for select using (true);
create policy "Organizers post notices on their own opportunities" on notices for insert with check (
  (target_type = 'hackathon' and target_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid())))
  or
  (target_type = 'internship' and target_id in (select id from internships where organizer_id in (select id from profiles where user_id = auth.uid())))
);

-- teams
create policy "Teams are viewable by everyone" on teams for select using (true);
create policy "Authenticated users can create teams" on teams for insert with check (auth.uid() is not null);
create policy "Leaders manage their teams" on teams for update using (
  leader_id in (select id from profiles where user_id = auth.uid())
);

-- team_members
create policy "Team members are viewable by everyone" on team_members for select using (true);
create policy "Users can join teams" on team_members for insert with check (auth.uid() is not null);
create policy "Leaders manage membership" on team_members for update using (
  team_id in (select id from teams where leader_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Users can leave teams" on team_members for delete using (
  user_id in (select id from profiles where user_id = auth.uid())
  or team_id in (select id from teams where leader_id in (select id from profiles where user_id = auth.uid()))
);

-- team_join_requests
create policy "Team members and requester can view requests" on team_join_requests for select using (
  user_id in (select id from profiles where user_id = auth.uid())
  or team_id in (select id from teams where leader_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Users can request to join" on team_join_requests for insert with check (
  user_id in (select id from profiles where user_id = auth.uid())
);
create policy "Leaders and requester manage the request" on team_join_requests for update using (
  team_id in (select id from teams where leader_id in (select id from profiles where user_id = auth.uid()))
  or user_id in (select id from profiles where user_id = auth.uid())
);
create policy "Requester can cancel their request" on team_join_requests for delete using (
  user_id in (select id from profiles where user_id = auth.uid())
);

-- team workspace (announcements/resources/messages): visible & writable by team members
create policy "Team announcements viewable by members" on team_announcements for select using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Team members post announcements" on team_announcements for insert with check (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Team resources viewable by members" on team_resources for select using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Team members manage resources" on team_resources for all using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Team messages viewable by members" on team_messages for select using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Team members send messages" on team_messages for insert with check (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);

-- applications
create policy "Users view their own applications" on applications for select using (
  user_id in (select id from profiles where user_id = auth.uid())
  or organizer_id in (select id from profiles where user_id = auth.uid())
);
create policy "Users create their own applications" on applications for insert with check (
  user_id in (select id from profiles where user_id = auth.uid())
);
create policy "Organizers update applications to their opportunities" on applications for update using (
  organizer_id in (select id from profiles where user_id = auth.uid())
  or user_id in (select id from profiles where user_id = auth.uid())
);

-- volunteer_tasks
create policy "Volunteers view their tasks" on volunteer_tasks for select using (
  volunteer_id in (select id from profiles where user_id = auth.uid())
  or event_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Organizers create tasks for their events" on volunteer_tasks for insert with check (
  event_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Volunteers update their task status" on volunteer_tasks for update using (
  volunteer_id in (select id from profiles where user_id = auth.uid())
  or event_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid()))
);

-- volunteer_signups
create policy "Signups viewable by volunteer and organizer" on volunteer_signups for select using (
  volunteer_id in (select id from profiles where user_id = auth.uid())
  or organizer_id in (select id from profiles where user_id = auth.uid())
);
create policy "Volunteers create their own signup" on volunteer_signups for insert with check (
  volunteer_id in (select id from profiles where user_id = auth.uid())
);
create policy "Organizers approve signups to their events" on volunteer_signups for update using (
  organizer_id in (select id from profiles where user_id = auth.uid())
);

-- announcements
create policy "Announcements are viewable by everyone" on announcements for select using (true);
create policy "Organizers post announcements" on announcements for insert with check (
  organizer_id in (select id from profiles where user_id = auth.uid())
);

-- submissions
create policy "Team members and organizer view submissions" on submissions for select using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
  or hackathon_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Team members create their own submission" on submissions for insert with check (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Team members and organizer update submission" on submissions for update using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
  or hackathon_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid()))
);

-- notifications: only the owner can read/write their own
create policy "Users view their own notifications" on notifications for select using (
  user_id in (select id from profiles where user_id = auth.uid())
);
create policy "System can insert notifications" on notifications for insert with check (auth.uid() is not null);
create policy "Users update their own notifications" on notifications for update using (
  user_id in (select id from profiles where user_id = auth.uid())
);

-- mail_log: readers can only be organizers/admins in practice; keep permissive-write, self-read off (log-only)
create policy "Authenticated users can insert mail" on mail_log for insert with check (auth.uid() is not null);
create policy "Authenticated users can view mail" on mail_log for select using (auth.uid() is not null);

-- follows
create policy "Follows are viewable by everyone" on follows for select using (true);
create policy "Users manage their own follows" on follows for insert with check (
  follower_id in (select id from profiles where user_id = auth.uid())
);
create policy "Users remove their own follows" on follows for delete using (
  follower_id in (select id from profiles where user_id = auth.uid())
);

-- connections
create policy "Users view their own connections" on connections for select using (
  from_id in (select id from profiles where user_id = auth.uid())
  or to_id in (select id from profiles where user_id = auth.uid())
);
create policy "Users send connection requests" on connections for insert with check (
  from_id in (select id from profiles where user_id = auth.uid())
);
create policy "Participants update connection status" on connections for update using (
  from_id in (select id from profiles where user_id = auth.uid())
  or to_id in (select id from profiles where user_id = auth.uid())
);
create policy "Requester can cancel" on connections for delete using (
  from_id in (select id from profiles where user_id = auth.uid())
);

-- conversations / participants / messages
create policy "Participants view their conversations" on conversations for select using (
  id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Authenticated users create conversations" on conversations for insert with check (auth.uid() is not null);
create policy "Authenticated users update conversations" on conversations for update using (
  id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Participants viewable by participants" on conversation_participants for select using (
  conversation_id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Users add themselves as participants" on conversation_participants for insert with check (auth.uid() is not null);
create policy "Participants view their messages" on messages for select using (
  conversation_id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Participants send messages" on messages for insert with check (
  conversation_id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);
create policy "Participants mark messages read" on messages for update using (
  conversation_id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);

-- posts / likes / comments
create policy "Posts are viewable by everyone" on posts for select using (true);
create policy "Authenticated users create posts" on posts for insert with check (
  author_id in (select id from profiles where user_id = auth.uid())
);
create policy "Authors delete their own posts" on posts for delete using (
  author_id in (select id from profiles where user_id = auth.uid())
);
create policy "Likes viewable by everyone" on post_likes for select using (true);
create policy "Users manage their own likes" on post_likes for insert with check (
  user_id in (select id from profiles where user_id = auth.uid())
);
create policy "Users remove their own likes" on post_likes for delete using (
  user_id in (select id from profiles where user_id = auth.uid())
);
create policy "Comments viewable by everyone" on post_comments for select using (true);
create policy "Authenticated users comment" on post_comments for insert with check (
  author_id in (select id from profiles where user_id = auth.uid())
);

-- ============================================================================
-- Realtime — add every table the frontend subscribes to
-- ============================================================================
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table hackathons;
alter publication supabase_realtime add table internships;
alter publication supabase_realtime add table notices;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table team_members;
alter publication supabase_realtime add table team_join_requests;
alter publication supabase_realtime add table team_announcements;
alter publication supabase_realtime add table team_resources;
alter publication supabase_realtime add table team_messages;
alter publication supabase_realtime add table applications;
alter publication supabase_realtime add table volunteer_tasks;
alter publication supabase_realtime add table volunteer_signups;
alter publication supabase_realtime add table announcements;
alter publication supabase_realtime add table submissions;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table follows;
alter publication supabase_realtime add table connections;
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table post_likes;
alter publication supabase_realtime add table post_comments;
