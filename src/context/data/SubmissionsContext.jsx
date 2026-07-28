import { createContext, useContext, useEffect, useMemo } from 'react'
import { supabase, isSupabaseConfigured, subscribeTable, applyRealtimeChange } from '../../lib/supabaseClient'
import { useLocalTable } from '../../lib/localStore'
import { uid } from '../../lib/utils'
import { seedSubmissions } from '../../data/mockData'

export const SubmissionsContext = createContext(null)
const KEY = 'sabrconnect.submissions'

// Depends on Notifications (addNotification, sendMail) and needs read access
// to Teams/Opportunities to build the winner-announcement message — passed
// in as `getTeam` / `getHackathon` lookups rather than importing those
// contexts directly.
export function useSubmissionsModule({ addNotification, sendMail, getTeam, getHackathon, getInternship }) {
  const [submissions, setSubmissions] = useLocalTable(KEY, seedSubmissions)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true
    supabase
      .from('submissions')
      .select('*')
      .then(({ data }) => {
        if (active && data) setSubmissions(data)
      })
    const unsubscribe = subscribeTable('submissions', (payload) => {
      setSubmissions((prev) => applyRealtimeChange(prev, payload))
    })
    return () => {
      active = false
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getSubmission = (teamId, hackathonId) =>
    submissions.find((s) => s.team_id === teamId && s.hackathon_id === hackathonId)

  // For solo (non-team) hackathon registrants — same table, keyed by
  // user_id instead of team_id (see migrations/006_individual_submissions.sql).
  const getIndividualSubmission = (userId, hackathonId) =>
    submissions.find((s) => s.user_id === userId && !s.team_id && s.hackathon_id === hackathonId)

  const getSubmissionsForHackathon = (hackathonId) => submissions.filter((s) => s.hackathon_id === hackathonId)

  // Internship equivalents of the two lookups above — same table, scoped by
  // internship_id instead of hackathon_id (see migrations/004_internship_submissions.sql).
  const getInternshipSubmission = (teamId, internshipId) =>
    submissions.find((s) => s.team_id === teamId && s.internship_id === internshipId)

  const getIndividualInternshipSubmission = (userId, internshipId) =>
    submissions.find((s) => s.user_id === userId && !s.team_id && s.internship_id === internshipId)

  const getSubmissionsForInternship = (internshipId) => submissions.filter((s) => s.internship_id === internshipId)

  const buildDraft = (data) => ({
    project_title: data.project_title || '',
    description: data.description || '',
    repo_url: data.repo_url || '',
    demo_url: data.demo_url || '',
    video_url: data.video_url || '',
    tech_stack: data.tech_stack || [],
  })

  const upsertSubmission = async (hackathonId, { teamId, userId }, data, existing, notifyOrganizer) => {
    const draft = buildDraft(data)

    if (existing) {
      if (isSupabaseConfigured) {
        await supabase.from('submissions').update({ ...draft, submitted_at: new Date().toISOString() }).eq('id', existing.id)
      }
      setSubmissions((list) =>
        list.map((s) => (s.id === existing.id ? { ...s, ...draft, submitted_at: new Date().toISOString() } : s)),
      )
      notifyOrganizer(true)
      return existing
    }

    if (isSupabaseConfigured) {
      const { data: row, error } = await supabase
        .from('submissions')
        .insert({ hackathon_id: hackathonId, team_id: teamId || null, user_id: userId || null, ...draft })
        .select()
        .single()
      if (error) {
        // eslint-disable-next-line no-console
        console.error('submitProject failed', error)
        return undefined
      }
      setSubmissions((list) => [row, ...list])
      notifyOrganizer(false)
      return row
    }

    const submission = {
      id: uid('sub'),
      hackathon_id: hackathonId,
      team_id: teamId || null,
      user_id: userId || null,
      submitted_at: new Date().toISOString(),
      ai_score: null,
      ai_reasons: [],
      ai_scored_at: null,
      organizer_score: null,
      organizer_notes: '',
      status: 'submitted',
      ...draft,
    }
    setSubmissions((list) => [submission, ...list])
    notifyOrganizer(false)
    return submission
  }

  const upsertInternshipSubmission = async (internshipId, { teamId, userId }, data, existing, notifyOrganizer) => {
    const draft = buildDraft(data)

    if (existing) {
      if (isSupabaseConfigured) {
        await supabase.from('submissions').update({ ...draft, submitted_at: new Date().toISOString() }).eq('id', existing.id)
      }
      setSubmissions((list) =>
        list.map((s) => (s.id === existing.id ? { ...s, ...draft, submitted_at: new Date().toISOString() } : s)),
      )
      notifyOrganizer(true)
      return existing
    }

    if (isSupabaseConfigured) {
      const { data: row, error } = await supabase
        .from('submissions')
        .insert({ internship_id: internshipId, team_id: teamId || null, user_id: userId || null, ...draft })
        .select()
        .single()
      if (error) {
        // eslint-disable-next-line no-console
        console.error('submitInternshipProject failed', error)
        return undefined
      }
      setSubmissions((list) => [row, ...list])
      notifyOrganizer(false)
      return row
    }

    const submission = {
      id: uid('sub'),
      internship_id: internshipId,
      team_id: teamId || null,
      user_id: userId || null,
      submitted_at: new Date().toISOString(),
      ai_score: null,
      ai_reasons: [],
      ai_scored_at: null,
      organizer_score: null,
      organizer_notes: '',
      status: 'submitted',
      ...draft,
    }
    setSubmissions((list) => [submission, ...list])
    notifyOrganizer(false)
    return submission
  }

  // Upserts by (team_id, hackathon_id) — resubmitting before the deadline
  // edits the same record rather than creating a duplicate.
  const submitProject = async (hackathonId, teamId, data) => {
    const existing = getSubmission(teamId, hackathonId)
    const notifyOrganizer = (isResubmission) => {
      const hackathon = getHackathon?.(hackathonId)
      const team = getTeam?.(teamId)
      const draft = buildDraft(data)
      if (!hackathon?.organizer_id) return
      addNotification(hackathon.organizer_id, {
        title: isResubmission ? 'Project resubmitted' : 'New project submission',
        message: `${team?.team_name || 'A team'} ${isResubmission ? 'updated their submission' : 'submitted'} "${draft.project_title}" for ${hackathon.title}.`,
        role: 'organizer',
        link: `/dashboard/organizer/events/hackathon/${hackathonId}?tab=judging`,
      })
    }
    return upsertSubmission(hackathonId, { teamId }, data, existing, notifyOrganizer)
  }

  // Same idea, for a solo registrant with no team.
  const submitIndividualProject = async (hackathonId, userId, userName, data) => {
    const existing = getIndividualSubmission(userId, hackathonId)
    const notifyOrganizer = (isResubmission) => {
      const hackathon = getHackathon?.(hackathonId)
      const draft = buildDraft(data)
      if (!hackathon?.organizer_id) return
      addNotification(hackathon.organizer_id, {
        title: isResubmission ? 'Project resubmitted' : 'New project submission',
        message: `${userName || 'A participant'} ${isResubmission ? 'updated their submission' : 'submitted'} "${draft.project_title}" for ${hackathon.title}.`,
        role: 'organizer',
        link: `/dashboard/organizer/events/hackathon/${hackathonId}?tab=judging`,
      })
    }
    return upsertSubmission(hackathonId, { userId }, data, existing, notifyOrganizer)
  }

  // Team equivalent of submitIndividualInternshipProject — a team that was
  // accepted into an internship submitting their project together.
  const submitTeamInternshipProject = async (internshipId, teamId, data) => {
    const existing = getInternshipSubmission(teamId, internshipId)
    const notifyOrganizer = (isResubmission) => {
      const internship = getInternship?.(internshipId)
      const team = getTeam?.(teamId)
      const draft = buildDraft(data)
      if (!internship?.organizer_id) return
      addNotification(internship.organizer_id, {
        title: isResubmission ? 'Project resubmitted' : 'New project submission',
        message: `${team?.team_name || 'A team'} ${isResubmission ? 'updated their submission' : 'submitted'} "${draft.project_title}" for ${internship.title}.`,
        role: 'organizer',
        link: `/dashboard/organizer/events/internship/${internshipId}?tab=judging`,
      })
    }
    return upsertInternshipSubmission(internshipId, { teamId }, data, existing, notifyOrganizer)
  }

  // Same idea again, for a solo internship applicant with no team.
  const submitIndividualInternshipProject = async (internshipId, userId, userName, data) => {
    const existing = getIndividualInternshipSubmission(userId, internshipId)
    const notifyOrganizer = (isResubmission) => {
      const internship = getInternship?.(internshipId)
      const draft = buildDraft(data)
      if (!internship?.organizer_id) return
      addNotification(internship.organizer_id, {
        title: isResubmission ? 'Project resubmitted' : 'New project submission',
        message: `${userName || 'A participant'} ${isResubmission ? 'updated their submission' : 'submitted'} "${draft.project_title}" for ${internship.title}.`,
        role: 'organizer',
        link: `/dashboard/organizer/events/internship/${internshipId}?tab=judging`,
      })
    }
    return upsertInternshipSubmission(internshipId, { userId }, data, existing, notifyOrganizer)
  }

  const setSubmissionAiScore = async (submissionId, { score, reasons } = {}) => {
    const updates = { ai_score: score, ai_reasons: reasons || [], ai_scored_at: new Date().toISOString() }
    if (isSupabaseConfigured) {
      await supabase.from('submissions').update(updates).eq('id', submissionId)
    }
    setSubmissions((list) => list.map((s) => (s.id === submissionId ? { ...s, ...updates } : s)))
  }

  const setSubmissionOrganizerScore = async (submissionId, { score, notes } = {}) => {
    const updates = { organizer_score: score, organizer_notes: notes || '' }
    if (isSupabaseConfigured) {
      await supabase.from('submissions').update(updates).eq('id', submissionId)
    }
    setSubmissions((list) => list.map((s) => (s.id === submissionId ? { ...s, ...updates } : s)))
  }

  // Shortlist / winner / reject. The AI only ever ranks and explains — moving
  // a submission to 'winner' is always this explicit organizer action, and
  // that's the only status transition that notifies the team/individual.
  const setSubmissionStatus = async (submissionId, status) => {
    const target = submissions.find((s) => s.id === submissionId)
    if (isSupabaseConfigured) {
      await supabase.from('submissions').update({ status }).eq('id', submissionId)
    }
    setSubmissions((list) => list.map((s) => (s.id === submissionId ? { ...s, status } : s)))

    if (!target) return target

    const opportunity = target.hackathon_id ? getHackathon?.(target.hackathon_id) : getInternship?.(target.internship_id)
    const opportunityTitle = opportunity?.title || (target.hackathon_id ? 'the hackathon' : 'the internship')
    const opportunityLink = target.hackathon_id
      ? `/dashboard/student/hackathons/${target.hackathon_id}`
      : `/dashboard/student/internships/${target.internship_id}`
    const team = target.team_id ? getTeam?.(target.team_id) : null
    // Solo registrants notify just themselves; team submissions notify every member.
    const recipients = team?.members?.length ? team.members : target.user_id ? [{ id: target.user_id, name: null }] : []
    const subjectName = team?.team_name || 'You'

    if (status === 'winner') {
      recipients.forEach((m) => {
        addNotification(m.id, {
          title: team ? 'Your team won! 🏆' : 'You won! 🏆',
          message: `${subjectName} ${team ? 'was' : 'were'} selected as the winner of ${opportunityTitle} for "${target.project_title}".`,
          role: 'student',
          link: team ? `/dashboard/student/teams/${team.id}` : opportunityLink,
        })
        sendMail({
          toName: m.name,
          subject: `🏆 ${subjectName} won ${opportunityTitle}!`,
          body: `Hi ${m.name || 'there'},\n\nCongratulations — ${team ? `${team.team_name} has` : 'you have'} been selected as the winner of ${opportunityTitle} for your project "${target.project_title}"!\n\nThe organizing team was impressed by your submission. Great work!\n\n— SabrConnect`,
        })
      })
    } else if (status === 'shortlisted') {
      recipients.forEach((m) =>
        addNotification(m.id, {
          title: "You've been shortlisted! ⭐",
          message: `${subjectName === 'You' ? 'Your' : `${subjectName}'s`} submission for ${opportunityTitle} made the shortlist.`,
          role: 'student',
          link: team ? `/dashboard/student/teams/${team.id}` : opportunityLink,
        }),
      )
    } else if (status === 'rejected') {
      recipients.forEach((m) =>
        addNotification(m.id, {
          title: 'Submission update',
          message: `${subjectName === 'You' ? 'Your' : `${subjectName}'s`} submission for ${opportunityTitle} wasn't selected this time.`,
          role: 'student',
          link: team ? `/dashboard/student/teams/${team.id}` : opportunityLink,
        }),
      )
    }
    return target
  }

  return {
    submissions,
    getSubmission,
    getIndividualSubmission,
    getSubmissionsForHackathon,
    getInternshipSubmission,
    getIndividualInternshipSubmission,
    getSubmissionsForInternship,
    submitProject,
    submitIndividualProject,
    submitTeamInternshipProject,
    submitIndividualInternshipProject,
    setSubmissionAiScore,
    setSubmissionOrganizerScore,
    setSubmissionStatus,
  }
}

export function SubmissionsProvider({ children, deps }) {
  const value = useSubmissionsModule(deps)
  const memoized = useMemo(() => value, [value.submissions])
  return <SubmissionsContext.Provider value={memoized}>{children}</SubmissionsContext.Provider>
}

export function useSubmissions() {
  const ctx = useContext(SubmissionsContext)
  if (!ctx) throw new Error('useSubmissions must be used within SubmissionsProvider')
  return ctx
}
