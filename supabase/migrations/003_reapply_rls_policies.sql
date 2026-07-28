-- Re-applies every RLS policy idempotently (drop-if-exists then
-- create). Run this if any table is rejecting inserts/selects with
-- 'new row violates row-level security policy' (Postgres code 42501)
-- even though schema.sql was already run once — that error means RLS
-- is ON for that table but the specific policy never actually got
-- created, usually because an earlier statement in the same SQL editor
-- run failed and aborted everything after it.

drop policy if exists "Profiles are viewable by everyone" on profiles;
create policy "Profiles are viewable by everyone" on profiles for select using (true);

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile" on profiles for update using (auth.uid() = user_id);

drop policy if exists "Organizers can update pending accounts" on profiles;
create policy "Organizers can update pending accounts" on profiles for update using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'organizer' and p.status = 'approved')
);

drop policy if exists "Hackathons are viewable by everyone" on hackathons;
create policy "Hackathons are viewable by everyone" on hackathons for select using (true);

drop policy if exists "Organizers manage their hackathons" on hackathons;
create policy "Organizers manage their hackathons" on hackathons for all using (
  organizer_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Internships are viewable by everyone" on internships;
create policy "Internships are viewable by everyone" on internships for select using (true);

drop policy if exists "Organizers manage their internships" on internships;
create policy "Organizers manage their internships" on internships for all using (
  organizer_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Notices are viewable by everyone" on notices;
create policy "Notices are viewable by everyone" on notices for select using (true);

drop policy if exists "Organizers post notices on their own opportunities" on notices;
create policy "Organizers post notices on their own opportunities" on notices for insert with check (
  (target_type = 'hackathon' and target_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid())))
  or
  (target_type = 'internship' and target_id in (select id from internships where organizer_id in (select id from profiles where user_id = auth.uid())))
);

drop policy if exists "Teams are viewable by everyone" on teams;
create policy "Teams are viewable by everyone" on teams for select using (true);

drop policy if exists "Authenticated users can create teams" on teams;
create policy "Authenticated users can create teams" on teams for insert with check (auth.uid() is not null);

drop policy if exists "Leaders manage their teams" on teams;
create policy "Leaders manage their teams" on teams for update using (
  leader_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Team members are viewable by everyone" on team_members;
create policy "Team members are viewable by everyone" on team_members for select using (true);

drop policy if exists "Users can join teams" on team_members;
create policy "Users can join teams" on team_members for insert with check (auth.uid() is not null);

drop policy if exists "Leaders manage membership" on team_members;
create policy "Leaders manage membership" on team_members for update using (
  team_id in (select id from teams where leader_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Users can leave teams" on team_members;
create policy "Users can leave teams" on team_members for delete using (
  user_id in (select id from profiles where user_id = auth.uid())
  or team_id in (select id from teams where leader_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Team members and requester can view requests" on team_join_requests;
create policy "Team members and requester can view requests" on team_join_requests for select using (
  user_id in (select id from profiles where user_id = auth.uid())
  or team_id in (select id from teams where leader_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Users can request to join" on team_join_requests;
create policy "Users can request to join" on team_join_requests for insert with check (
  user_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Leaders and requester manage the request" on team_join_requests;
create policy "Leaders and requester manage the request" on team_join_requests for update using (
  team_id in (select id from teams where leader_id in (select id from profiles where user_id = auth.uid()))
  or user_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Requester can cancel their request" on team_join_requests;
create policy "Requester can cancel their request" on team_join_requests for delete using (
  user_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Team announcements viewable by members" on team_announcements;
create policy "Team announcements viewable by members" on team_announcements for select using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Team members post announcements" on team_announcements;
create policy "Team members post announcements" on team_announcements for insert with check (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Team resources viewable by members" on team_resources;
create policy "Team resources viewable by members" on team_resources for select using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Team members manage resources" on team_resources;
create policy "Team members manage resources" on team_resources for all using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Team messages viewable by members" on team_messages;
create policy "Team messages viewable by members" on team_messages for select using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Team members send messages" on team_messages;
create policy "Team members send messages" on team_messages for insert with check (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Users view their own applications" on applications;
create policy "Users view their own applications" on applications for select using (
  user_id in (select id from profiles where user_id = auth.uid())
  or organizer_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Users create their own applications" on applications;
create policy "Users create their own applications" on applications for insert with check (
  user_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Organizers update applications to their opportunities" on applications;
create policy "Organizers update applications to their opportunities" on applications for update using (
  organizer_id in (select id from profiles where user_id = auth.uid())
  or user_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Volunteers view their tasks" on volunteer_tasks;
create policy "Volunteers view their tasks" on volunteer_tasks for select using (
  volunteer_id in (select id from profiles where user_id = auth.uid())
  or event_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Organizers create tasks for their events" on volunteer_tasks;
create policy "Organizers create tasks for their events" on volunteer_tasks for insert with check (
  event_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Volunteers update their task status" on volunteer_tasks;
create policy "Volunteers update their task status" on volunteer_tasks for update using (
  volunteer_id in (select id from profiles where user_id = auth.uid())
  or event_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Signups viewable by volunteer and organizer" on volunteer_signups;
create policy "Signups viewable by volunteer and organizer" on volunteer_signups for select using (
  volunteer_id in (select id from profiles where user_id = auth.uid())
  or organizer_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Volunteers create their own signup" on volunteer_signups;
create policy "Volunteers create their own signup" on volunteer_signups for insert with check (
  volunteer_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Organizers approve signups to their events" on volunteer_signups;
create policy "Organizers approve signups to their events" on volunteer_signups for update using (
  organizer_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Announcements are viewable by everyone" on announcements;
create policy "Announcements are viewable by everyone" on announcements for select using (true);

drop policy if exists "Organizers post announcements" on announcements;
create policy "Organizers post announcements" on announcements for insert with check (
  organizer_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Team members and organizer view submissions" on submissions;
create policy "Team members and organizer view submissions" on submissions for select using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
  or hackathon_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Team members create their own submission" on submissions;
create policy "Team members create their own submission" on submissions for insert with check (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Team members and organizer update submission" on submissions;
create policy "Team members and organizer update submission" on submissions for update using (
  team_id in (select team_id from team_members where user_id in (select id from profiles where user_id = auth.uid()))
  or hackathon_id in (select id from hackathons where organizer_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Users view their own notifications" on notifications;
create policy "Users view their own notifications" on notifications for select using (
  user_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "System can insert notifications" on notifications;
create policy "System can insert notifications" on notifications for insert with check (auth.uid() is not null);

drop policy if exists "Users update their own notifications" on notifications;
create policy "Users update their own notifications" on notifications for update using (
  user_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Authenticated users can insert mail" on mail_log;
create policy "Authenticated users can insert mail" on mail_log for insert with check (auth.uid() is not null);

drop policy if exists "Authenticated users can view mail" on mail_log;
create policy "Authenticated users can view mail" on mail_log for select using (auth.uid() is not null);

drop policy if exists "Follows are viewable by everyone" on follows;
create policy "Follows are viewable by everyone" on follows for select using (true);

drop policy if exists "Users manage their own follows" on follows;
create policy "Users manage their own follows" on follows for insert with check (
  follower_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Users remove their own follows" on follows;
create policy "Users remove their own follows" on follows for delete using (
  follower_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Users view their own connections" on connections;
create policy "Users view their own connections" on connections for select using (
  from_id in (select id from profiles where user_id = auth.uid())
  or to_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Users send connection requests" on connections;
create policy "Users send connection requests" on connections for insert with check (
  from_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Participants update connection status" on connections;
create policy "Participants update connection status" on connections for update using (
  from_id in (select id from profiles where user_id = auth.uid())
  or to_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Requester can cancel" on connections;
create policy "Requester can cancel" on connections for delete using (
  from_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Participants view their conversations" on conversations;
create policy "Participants view their conversations" on conversations for select using (
  id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Authenticated users create conversations" on conversations;
create policy "Authenticated users create conversations" on conversations for insert with check (auth.uid() is not null);

drop policy if exists "Authenticated users update conversations" on conversations;
create policy "Authenticated users update conversations" on conversations for update using (
  id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Participants viewable by participants" on conversation_participants;
create policy "Participants viewable by participants" on conversation_participants for select using (
  conversation_id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Users add themselves as participants" on conversation_participants;
create policy "Users add themselves as participants" on conversation_participants for insert with check (auth.uid() is not null);

drop policy if exists "Participants view their messages" on messages;
create policy "Participants view their messages" on messages for select using (
  conversation_id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Participants send messages" on messages;
create policy "Participants send messages" on messages for insert with check (
  conversation_id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Participants mark messages read" on messages;
create policy "Participants mark messages read" on messages for update using (
  conversation_id in (select conversation_id from conversation_participants where user_id in (select id from profiles where user_id = auth.uid()))
);

drop policy if exists "Posts are viewable by everyone" on posts;
create policy "Posts are viewable by everyone" on posts for select using (true);

drop policy if exists "Authenticated users create posts" on posts;
create policy "Authenticated users create posts" on posts for insert with check (
  author_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Authors delete their own posts" on posts;
create policy "Authors delete their own posts" on posts for delete using (
  author_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Likes viewable by everyone" on post_likes;
create policy "Likes viewable by everyone" on post_likes for select using (true);

drop policy if exists "Users manage their own likes" on post_likes;
create policy "Users manage their own likes" on post_likes for insert with check (
  user_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Users remove their own likes" on post_likes;
create policy "Users remove their own likes" on post_likes for delete using (
  user_id in (select id from profiles where user_id = auth.uid())
);

drop policy if exists "Comments viewable by everyone" on post_comments;
create policy "Comments viewable by everyone" on post_comments for select using (true);

drop policy if exists "Authenticated users comment" on post_comments;
create policy "Authenticated users comment" on post_comments for insert with check (
  author_id in (select id from profiles where user_id = auth.uid())
);
