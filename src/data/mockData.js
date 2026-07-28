// Seed data mirrors the Supabase schema in /supabase/schema.sql
// (profiles, hackathons, internships, teams, team_members, applications,
// volunteer_tasks, announcements) so the mock layer and the real backend
// stay interchangeable. This is loaded once by DataContext and then
// persisted (and mutated) in localStorage from there on.

export const seedHackathons = []

export const seedInternships = []

export const seedTeams = []

export const seedApplications = []

export const seedVolunteerTasks = []

export const seedVolunteerSignups = []

// ---------------------------------------------------------------------------
// Project submissions — feeds the organizer Judging tab.
export const seedSubmissions = []

export const seedAnnouncements = []

export const activityFeed = []

export const platformStats = {
  registeredUsers: 0,
  teamsCreated: 0,
  opportunitiesLive: 0,
  eventsCompleted: 0,
}

export const seedStudentProfiles = []

// ---------------------------------------------------------------------------
// Community feed — seed posts.
export const seedPosts = []