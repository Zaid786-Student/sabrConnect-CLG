import { createContext, useContext, useEffect, useMemo } from 'react'
import { supabase, isSupabaseConfigured, subscribeTable, applyRealtimeChange } from '../../lib/supabaseClient'
import { useLocalTable } from '../../lib/localStore'
import { uid } from '../../lib/utils'
import { seedApplications } from '../../data/mockData'

export const ApplicationsContext = createContext(null)
const APPLICATIONS_KEY = 'sabrconnect.applications'

function fromDb(row) {
  return {
    ...row,
    formData: row.form_data,
    member_count: row.member_count,
    members: row.members || [],
  }
}

function toDb({ formData, ...rest }) {
  return { ...rest, form_data: formData }
}

// Takes its cross-module dependencies as arguments rather than importing
// other contexts directly — DataProvider wires these together, which keeps
// each module independently testable and avoids import cycles.
export function useApplicationsModule({ addNotification, sendMail, adjustParticipantCount }) {
  const [applications, setApplications] = useLocalTable(APPLICATIONS_KEY, seedApplications)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true
    supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active && data) setApplications(data.map(fromDb))
      })
    const unsubscribe = subscribeTable('applications', (payload) => {
      setApplications((prev) => applyRealtimeChange(prev, payload, fromDb))
    })
    return () => {
      active = false
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getApplication = (userId, opportunityId) =>
    applications.find((a) => a.user_id === userId && a.opportunity_id === opportunityId)

  const getApplicationById = (applicationId) => applications.find((a) => a.id === applicationId)

  // `team` is optional: pass the student's Team object to register the whole
  // team in one go. The application is still owned by the submitting user
  // (normally the team leader), but carries the full member roster so the
  // organizer can see and approve it as a unit.
  const applyToOpportunity = async ({ type, opportunity, user, formData, team, notifyApplicant = false }) => {
    const existing = getApplication(user?.id, opportunity.id)
    if (existing) return existing

    const members = team?.members?.length
      ? team.members.map((m) => ({ id: m.id, name: m.name }))
      : [{ id: user?.id, name: user?.full_name }]

    const draft = {
      user_id: user?.id,
      user_name: user?.full_name,
      user_email: user?.email,
      organizer_id: opportunity.organizer_id,
      opportunity_id: opportunity.id,
      opportunity_type: type,
      title: opportunity.title,
      status: 'submitted',
      formData,
      team_id: team?.id || null,
      team_name: team?.team_name || null,
      member_count: members.length,
      members,
    }

    let application
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('applications').insert(toDb(draft)).select().single()
      if (error) {
        // eslint-disable-next-line no-console
        console.error('applyToOpportunity failed', error)
        return undefined
      }
      application = fromDb(data)
      setApplications((list) => (list.some((a) => a.id === application.id) ? list : [application, ...list]))
    } else {
      application = { id: uid('app'), created_at: new Date().toISOString(), ...draft }
      setApplications((list) => [application, ...list])
    }

    addNotification(opportunity.organizer_id, {
      title: 'New application received',
      message: team
        ? `${team.team_name} (${members.length} members) applied to ${opportunity.title}.`
        : `${user?.full_name || 'A student'} applied to ${opportunity.title}.`,
      role: 'organizer',
      link: '/dashboard/organizer/participants',
    })

    // Used by the "leader registers, teammates confirm via link" flow — the
    // leader gets an immediate mail + in-app confirmation that their
    // registration went through, same channel setInApplicationStatus already
    // uses for the accepted/rejected emails further down.
    if (notifyApplicant && user?.id) {
      addNotification(user.id, {
        title: 'Registration submitted ✅',
        message: `You've registered for ${opportunity.title}. We'll notify you once it's reviewed.`,
        role: 'student',
        link: '/dashboard/student/applications',
      })
      sendMail({
        to: user.email,
        toName: user.full_name,
        subject: `You've registered for ${opportunity.title}`,
        body: `Hi ${user.full_name || 'there'},\n\nYou have successfully registered for ${opportunity.title}. Your teammates will each get an invite link to confirm their own spot on the roster.\n\n— SabrConnect`,
      })
    }
    return application
  }

  const setApplicationStatus = async (applicationId, status) => {
    const target = applications.find((a) => a.id === applicationId)
    if (!target) return
    const previousStatus = target.status

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('applications').update({ status }).eq('id', applicationId)
      if (error) return
    }
    setApplications((list) => list.map((a) => (a.id === applicationId ? { ...a, status } : a)))

    if (previousStatus !== status) {
      const count = target.member_count || 1
      // Moving into 'accepted' adds the whole team/individual to the live
      // participant count; moving *away* from 'accepted' removes them again.
      if (status === 'accepted' && previousStatus !== 'accepted') {
        adjustParticipantCount(target.opportunity_type, target.opportunity_id, count)
      } else if (previousStatus === 'accepted' && status !== 'accepted') {
        adjustParticipantCount(target.opportunity_type, target.opportunity_id, -count)
      }
    }

    if (status === 'accepted') {
      sendMail({
        to: target.user_email,
        toName: target.user_name,
        subject: `You're in! Confirmed for ${target.title}`,
        body: `Hi ${target.user_name || 'there'},\n\nGreat news — you have successfully enrolled in ${target.title}. Your application has been reviewed and accepted by the organizing team.\n\nWe'll share further logistics and updates soon. We're excited to have you on board!\n\n— SabrConnect`,
      })
      addNotification(target.user_id, {
        title: 'Application accepted 🎉',
        message: target.team_name
          ? `${target.team_name} has successfully enrolled in ${target.title}. Check your email for confirmation.`
          : `You've successfully enrolled in ${target.title}. Check your email for confirmation.`,
        role: 'student',
        link: '/dashboard/student/applications',
      })
      ;(target.members || [])
        .filter((m) => m.id && m.id !== target.user_id)
        .forEach((m) =>
          addNotification(m.id, {
            title: 'Application accepted 🎉',
            message: `Your team ${target.team_name || ''} has been accepted into ${target.title}.`,
            role: 'student',
            link: '/dashboard/student/applications',
          }),
        )
    } else if (status === 'rejected') {
      addNotification(target.user_id, {
        title: 'Application update',
        message: `Your application to ${target.title} was not accepted this time.`,
        role: 'student',
        link: '/dashboard/student/applications',
      })
    } else if (status === 'in_review') {
      addNotification(target.user_id, {
        title: 'Application under review',
        message: `Your application to ${target.title} is now being reviewed by the organizer.`,
        role: 'student',
        link: '/dashboard/student/applications',
      })
    }
  }

  // Called by TeamsContext when a new member joins a team that already has
  // an accepted application, so the opportunity's participant roster grows
  // with the team instead of staying frozen at signup time.
  const addMemberToAcceptedApplication = async (teamId, member) => {
    const acceptedApp = applications.find((a) => a.team_id === teamId && a.status === 'accepted')
    if (!acceptedApp) return
    const nextMembers = [...(acceptedApp.members || []), { id: member.id, name: member.name }]
    const nextCount = (acceptedApp.member_count || 1) + 1
    if (isSupabaseConfigured) {
      await supabase
        .from('applications')
        .update({ members: nextMembers, member_count: nextCount })
        .eq('id', acceptedApp.id)
    }
    setApplications((list) =>
      list.map((a) => (a.id === acceptedApp.id ? { ...a, members: nextMembers, member_count: nextCount } : a)),
    )
    adjustParticipantCount(acceptedApp.opportunity_type, acceptedApp.opportunity_id, 1)
  }

  // ---------- Member self-confirmation ----------
  // The leader registers the whole team upfront (name + phone only for
  // teammates), then shares one link per teammate. Opening that link lets a
  // teammate fill in the rest of their own details (phone/college/year/etc)
  // and claims their slot on the real `members` roster — mirroring exactly
  // how a team member joining via TeamsContext adds themselves to an
  // already-accepted application (see addMemberToAcceptedApplication above).
  const confirmApplicationMember = async (applicationId, token, currentUser, details = {}) => {
    const application = getApplicationById(applicationId)
    if (!application) return { success: false, error: 'NOT_FOUND' }

    const pendingMembers = application.formData?.pendingMembers || []
    const index = pendingMembers.findIndex((m) => m.token === token)
    if (index === -1) return { success: false, error: 'NOT_FOUND' }
    if (pendingMembers[index].confirmed) return { success: false, error: 'ALREADY_CONFIRMED' }

    const alreadyOnRoster = (application.members || []).some((m) => m.id === currentUser?.id)
    if (alreadyOnRoster) return { success: false, error: 'ALREADY_CONFIRMED' }

    const confirmedEntry = {
      ...pendingMembers[index],
      confirmed: true,
      id: currentUser?.id,
      phone: details.phone || pendingMembers[index].phone,
      college: details.college || '',
      year: details.year || '',
      gender: details.gender || '',
      githubUrl: details.githubUrl || '',
    }
    const nextPendingMembers = pendingMembers.map((m, i) => (i === index ? confirmedEntry : m))
    const nextFormData = { ...application.formData, pendingMembers: nextPendingMembers }
    const nextMembers = [...(application.members || []), { id: currentUser?.id, name: confirmedEntry.name }]
    const nextCount = (application.member_count || 1) + 1

    if (isSupabaseConfigured) {
      await supabase
        .from('applications')
        .update(toDb({ formData: nextFormData, members: nextMembers, member_count: nextCount }))
        .eq('id', applicationId)
    }
    setApplications((list) =>
      list.map((a) => (a.id === applicationId ? { ...a, formData: nextFormData, members: nextMembers, member_count: nextCount } : a)),
    )

    if (application.status === 'accepted') {
      adjustParticipantCount(application.opportunity_type, application.opportunity_id, 1)
    }

    addNotification(application.user_id, {
      title: 'Teammate confirmed their registration',
      message: `${confirmedEntry.name} confirmed their spot for ${application.title}.`,
      role: 'student',
      link: '/dashboard/student/applications',
    })

    return { success: true, application: { ...application, formData: nextFormData, members: nextMembers, member_count: nextCount } }
  }

  return {
    applications,
    getApplication,
    getApplicationById,
    applyToOpportunity,
    setApplicationStatus,
    addMemberToAcceptedApplication,
    confirmApplicationMember,
  }
}

export function ApplicationsProvider({ children, deps }) {
  const value = useApplicationsModule(deps)
  const memoized = useMemo(() => value, [value.applications])
  return <ApplicationsContext.Provider value={memoized}>{children}</ApplicationsContext.Provider>
}

export function useApplications() {
  const ctx = useContext(ApplicationsContext)
  if (!ctx) throw new Error('useApplications must be used within ApplicationsProvider')
  return ctx
}
