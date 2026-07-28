import { createContext, useContext, useMemo, useRef } from 'react'
import { NotificationsContext, useNotificationsModule } from './NotificationsContext'
import { OpportunitiesContext, useOpportunitiesModule } from './OpportunitiesContext'
import { ApplicationsContext, useApplicationsModule } from './ApplicationsContext'
import { TeamsContext, useTeamsModule } from './TeamsContext'
import { VolunteerContext, useVolunteerModule } from './VolunteerContext'
import { AnnouncementsContext, useAnnouncementsModule } from './AnnouncementsContext'
import { SubmissionsContext, useSubmissionsModule } from './SubmissionsContext'
import { SocialContext, useSocialModule } from './SocialContext'

// This is the only place any of the eight data modules is actually
// mounted. Each module is a plain hook (useXModule) that owns its own
// state + Supabase Realtime subscription; DataProvider wires the small
// number of cross-module calls they need (e.g. applying to an opportunity
// needs to raise a notification) and re-exposes each module through its own
// React Context, so a component can either:
//   - import a granular hook, e.g. `useTeams()` from context/data/TeamsContext
//   - or import the legacy combined `useData()` below, unchanged from the
//     original monolithic DataContext, so none of the existing 28 pages that
//     already call `useData()` need to be touched.
const CombinedDataContext = createContext(null)

export function DataProvider({ children }) {
  const notifications = useNotificationsModule()

  // Opportunities needs to look up who applied to a hackathon/internship
  // (to notify them when a notice is posted), but that data lives in
  // Applications — which itself needs Opportunities' adjustParticipantCount.
  // A ref breaks the cycle: the lookup function only reads applicationsRef
  // when a notice is actually posted (a later user action), by which point
  // the ref has already been filled in below, regardless of hook call order.
  const applicationsRef = useRef(null)
  const getApplicantIdsForOpportunity = (opportunityId) => {
    const ids = new Set()
    ;(applicationsRef.current?.applications || [])
      .filter((a) => a.opportunity_id === opportunityId)
      .forEach((a) => {
        const members = a.members?.length ? a.members : [{ id: a.user_id }]
        members.forEach((m) => m.id && ids.add(m.id))
      })
    return Array.from(ids)
  }

  const opportunities = useOpportunitiesModule({
    addNotification: notifications.addNotification,
    getApplicantIdsForOpportunity,
  })
  const applications = useApplicationsModule({
    addNotification: notifications.addNotification,
    sendMail: notifications.sendMail,
    adjustParticipantCount: opportunities.adjustParticipantCount,
  })
  applicationsRef.current = applications

  const teams = useTeamsModule({
    addNotification: notifications.addNotification,
    applyToOpportunity: applications.applyToOpportunity,
    addMemberToAcceptedApplication: applications.addMemberToAcceptedApplication,
    getHackathon: (id) => opportunities.hackathons.find((h) => h.id === id),
    getInternship: (id) => opportunities.internships.find((i) => i.id === id),
  })
  const volunteer = useVolunteerModule({
    addNotification: notifications.addNotification,
    sendMail: notifications.sendMail,
    getHackathon: (id) => opportunities.hackathons.find((h) => h.id === id),
  })
  const announcements = useAnnouncementsModule({ addNotification: notifications.addNotification })
  const submissions = useSubmissionsModule({
    addNotification: notifications.addNotification,
    sendMail: notifications.sendMail,
    getTeam: teams.getTeam,
    getHackathon: (id) => opportunities.hackathons.find((h) => h.id === id),
    getInternship: (id) => opportunities.internships.find((i) => i.id === id),
  })
  const social = useSocialModule({ addNotification: notifications.addNotification })

  // Legacy shape: every field/function the original DataContext exposed,
  // flattened into one object so `useData()` keeps working unmodified.
  const combined = useMemo(
    () => ({
      ...notifications,
      ...opportunities,
      ...applications,
      ...teams,
      ...volunteer,
      ...announcements,
      ...submissions,
      ...social,
    }),
    [notifications, opportunities, applications, teams, volunteer, announcements, submissions, social],
  )

  return (
    <NotificationsContext.Provider value={notifications}>
      <OpportunitiesContext.Provider value={opportunities}>
        <ApplicationsContext.Provider value={applications}>
          <TeamsContext.Provider value={teams}>
            <VolunteerContext.Provider value={volunteer}>
              <AnnouncementsContext.Provider value={announcements}>
                <SubmissionsContext.Provider value={submissions}>
                  <SocialContext.Provider value={social}>
                    <CombinedDataContext.Provider value={combined}>{children}</CombinedDataContext.Provider>
                  </SocialContext.Provider>
                </SubmissionsContext.Provider>
              </AnnouncementsContext.Provider>
            </VolunteerContext.Provider>
          </TeamsContext.Provider>
        </ApplicationsContext.Provider>
      </OpportunitiesContext.Provider>
    </NotificationsContext.Provider>
  )
}

// Legacy combined hook — identical surface to the original DataContext.
export function useData() {
  const ctx = useContext(CombinedDataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
