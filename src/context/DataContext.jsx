// DataContext has been split into per-domain modules under ./data/*
// (Notifications, Opportunities, Applications, Teams, Volunteer,
// Announcements, Submissions, Social) — each owns its own state, Supabase
// queries, and Realtime subscription. This file re-exports the composed
// provider and the legacy combined `useData()` hook so every existing page
// that imports from 'context/DataContext' keeps working unchanged.
//
// New code should prefer the granular hooks, e.g.:
//   import { useTeams } from './data/TeamsContext'
//   import { useSocial } from './data/SocialContext'
export { DataProvider, useData } from './data/DataProvider'
