import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { supabase, isSupabaseConfigured, subscribeTable } from '../../lib/supabaseClient'
import { useLocalTable } from '../../lib/localStore'
import { uid, generateTeamCode, TEAM_CAPACITY } from '../../lib/utils'
import { seedTeams } from '../../data/mockData'

export const TeamsContext = createContext(null)
const TEAMS_KEY = 'sabrconnect.teams'

// `team_members.name` / `team_join_requests.user_name` are denormalized
// snapshots taken when a row is written. If a row was ever written without
// a name (e.g. requestToJoinTeam never saved one), that member or requester
// shows up blank forever. `profilesById` — a live lookup straight from the
// `profiles` table — is used as a fallback so a name is always resolvable
// from the user_id, no matter how the row got created.
function memberFromDb(m, profilesById) {
  return {
    id: m.user_id,
    name: m.name || profilesById[m.user_id]?.full_name || 'Team member',
    email: m.email || '',
    contact: m.contact || '',
    gender: m.gender || '',
    linkedinUrl: m.linkedin_url || '',
    role: m.role,
    skills: m.skills || [],
    isLeader: m.is_leader,
    bio: m.bio || '',
    experience: m.experience || 'Intermediate',
    projects: [],
    portfolioUrl: m.portfolio_url || '',
    githubUrl: m.github_url || '',
    availability: m.availability || 'Available',
  }
}

function assembleTeams(teamRows, memberRows, joinReqRows, annRows, resRows, msgRows, profileRows) {
  const profilesById = Object.fromEntries((profileRows || []).map((p) => [p.id, p]))
  return teamRows.map((t) => {
    const teamMembers = memberRows.filter((m) => m.team_id === t.id).map((m) => memberFromDb(m, profilesById))
    const leaderMember = teamMembers.find((m) => m.id === t.leader_id)
    return {
    ...t,
    leader_name: leaderMember?.name || profilesById[t.leader_id]?.full_name || '',
    members: teamMembers,
    joinRequests: joinReqRows
      .filter((r) => r.team_id === t.id)
      .map((r) => ({
        id: r.id,
        user_id: r.user_id,
        user_name: r.user_name || profilesById[r.user_id]?.full_name || 'Student',
        role: r.role,
        skills: r.skills,
        message: r.message,
        status: r.status,
        created_at: r.created_at,
      })),
    teamAnnouncements: annRows.filter((a) => a.team_id === t.id).map((a) => ({ id: a.id, author_name: a.author_name, title: a.title, content: a.content, created_at: a.created_at })),
    resources: resRows.filter((r) => r.team_id === t.id).map((r) => ({ id: r.id, added_by: r.added_by, name: r.name, url: r.url, created_at: r.created_at })),
    messages: msgRows
      .filter((m) => m.team_id === t.id)
      .map((m) => ({ id: m.id, text: m.text, sender_id: m.sender_id, sender_name: m.sender_name, type: m.type, attachment: m.attachment, created_at: m.created_at })),
    openSlots: t.open_slots,
    rolesNeeded: t.roles_needed,
  }})
}

// Depends on Notifications (addNotification) and Applications (to
// auto-register a team against an opportunity it was created for, and to
// keep an already-accepted application's roster in sync when members join).
export function useTeamsModule({ addNotification, applyToOpportunity, addMemberToAcceptedApplication, getHackathon, getInternship }) {
  const [teams, setTeams] = useLocalTable(TEAMS_KEY, seedTeams)
  const teamsRef = useRef(teams)
  teamsRef.current = teams

  const reload = async () => {
    const [{ data: teamRows }, { data: memberRows }, { data: joinReqRows }, { data: annRows }, { data: resRows }, { data: msgRows }, { data: profileRows }] =
      await Promise.all([
        supabase.from('teams').select('*').order('created_at', { ascending: false }),
        supabase.from('team_members').select('*'),
        supabase.from('team_join_requests').select('*'),
        supabase.from('team_announcements').select('*').order('created_at', { ascending: false }),
        supabase.from('team_resources').select('*').order('created_at', { ascending: false }),
        supabase.from('team_messages').select('*').order('created_at', { ascending: true }),
        supabase.from('profiles').select('id, full_name'),
      ])
    if (!teamRows) return
    setTeams(assembleTeams(teamRows, memberRows || [], joinReqRows || [], annRows || [], resRows || [], msgRows || [], profileRows || []))
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    reload()
    // Any of these tables changing reshapes the nested team object, so a
    // full reload keeps the merge logic simple and always correct — teams
    // data doesn't change often enough for this to be a performance concern.
    const unsubs = [
      subscribeTable('teams', reload),
      subscribeTable('team_members', reload),
      subscribeTable('team_join_requests', reload),
      subscribeTable('team_announcements', reload),
      subscribeTable('team_resources', reload),
      subscribeTable('team_messages', reload),
    ]
    return () => unsubs.forEach((u) => u())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getTeam = (teamId) => teamsRef.current.find((t) => t.id === teamId)

  // Prevents the same email being used to register (as leader) or join (as
  // member) more than one team — used by both createTeam and joinTeamByCode.
  const isEmailAlreadyRegistered = (email) => {
    if (!email) return false
    const target = email.trim().toLowerCase()
    return teamsRef.current.some(
      (t) =>
        (t.leader_email || '').trim().toLowerCase() === target ||
        (t.members || []).some((m) => (m.email || '').trim().toLowerCase() === target),
    )
  }

  const generateUniqueTeamCode = () => {
    let code
    let attempts = 0
    do {
      code = generateTeamCode()
      attempts += 1
    } while (teamsRef.current.some((t) => t.team_code === code) && attempts < 20)
    return code
  }

  // The organizer can set a custom "members per team" size per hackathon
  // (hackathon.team_size) which falls back to the app-wide TEAM_CAPACITY
  // default when left blank — mirrors the same fallback HackathonDetail.jsx
  // already uses to render its own team-size UI, so the two never disagree.
  const capacityForOpportunity = (opportunityId, opportunityType) => {
    if (!opportunityId) return TEAM_CAPACITY
    const opportunity = opportunityType === 'internship' ? getInternship?.(opportunityId) : getHackathon?.(opportunityId)
    return opportunity?.team_size || TEAM_CAPACITY
  }

  // The actual gate for "is this team full" — computed live from real
  // capacity minus the real member count, never trusted from the stored
  // open_slots counter. That counter is still written on every join (below)
  // for display/back-compat, but it's just a cache: if it ever drifts (a
  // hackathon's team_size changed after the team formed, a row was edited
  // directly, etc.) a stale counter would otherwise let one too many people
  // in, or wrongly block the very last open spot. This can't drift because
  // it's derived fresh from team.members every time.
  const remainingSlots = (team) => capacityForOpportunity(team.opportunity_id, team.opportunity_type) - team.members.length

  const createTeam = async (data, creator) => {
    const leaderEmail = (data.leaderEmail || creator?.email || '').trim()
    if (isEmailAlreadyRegistered(leaderEmail)) {
      return { success: false, error: 'ALREADY_REGISTERED' }
    }
    // A student can already be leading/on a team for this same opportunity
    // (e.g. they joined one by code, then tried registering a second team
    // with a different typed-in email) — block that the same way
    // requestToJoinTeam already does for join requests.
    if (data.opportunity_id && hasConflictingOpportunityTeam(creator?.id, data.opportunity_id)) {
      return { success: false, error: 'ALREADY_REGISTERED' }
    }

    const teamCode = generateUniqueTeamCode()
    const teamCapacity = capacityForOpportunity(data.opportunity_id, data.opportunity_type)

    const memberProfile = {
      id: creator?.id || uid('user'),
      name: data.leaderName || creator?.full_name || 'You',
      email: leaderEmail,
      contact: data.leaderContact || '',
      role: data.creatorRole,
      skills: data.creatorSkills || [],
      isLeader: true,
      bio: creator?.bio || '',
      experience: data.creatorExperience || 'Intermediate',
      projects: [],
      portfolioUrl: '',
      githubUrl: data.leaderGithub || '',
      linkedinUrl: data.leaderLinkedin || '',
      gender: data.leaderGender || '',
      availability: 'Available',
    }

    let team
    if (isSupabaseConfigured) {
      const { data: row, error } = await supabase
        .from('teams')
        .insert({
          team_name: data.team_name,
          leader_id: memberProfile.id,
          leader_email: leaderEmail,
          leader_contact: data.leaderContact || '',
          leader_github: data.leaderGithub || '',
          leader_linkedin: data.leaderLinkedin || '',
          leader_gender: data.leaderGender || '',
          team_code: teamCode,
          description: data.description,
          goal: data.goal,
          project_name: data.project_name,
          comm_link: data.comm_link,
          skills: data.creatorSkills || [],
          interests: data.interests || [],
          roles_needed: data.rolesNeeded || [],
          open_slots: teamCapacity - 1,
          opportunity_id: data.opportunity_id || null,
          opportunity_title: data.opportunity_title || '',
          opportunity_type: data.opportunity_type || null,
        })
        .select()
        .single()
      if (error) {
        // eslint-disable-next-line no-console
        console.error('createTeam failed', error)
        return { success: false, error: 'UNKNOWN' }
      }
      await supabase.from('team_members').insert({
        team_id: row.id,
        user_id: memberProfile.id,
        name: memberProfile.name,
        email: memberProfile.email,
        contact: memberProfile.contact,
        gender: memberProfile.gender,
        linkedin_url: memberProfile.linkedinUrl,
        is_leader: true,
        role: memberProfile.role,
        skills: memberProfile.skills,
        bio: memberProfile.bio,
        experience: memberProfile.experience,
        github_url: memberProfile.githubUrl,
        availability: memberProfile.availability,
      })
      team = {
        ...row,
        leader_name: memberProfile.name,
        members: [memberProfile],
        joinRequests: [],
        teamAnnouncements: [],
        resources: [],
        messages: [],
        achievements: [],
        openSlots: row.open_slots,
        rolesNeeded: row.roles_needed,
      }
      setTeams((list) => [team, ...list])
    } else {
      team = {
        id: uid('team'),
        created_at: new Date().toISOString(),
        leader_id: memberProfile.id,
        leader_name: memberProfile.name,
        leader_email: leaderEmail,
        leader_contact: data.leaderContact || '',
        leader_github: data.leaderGithub || '',
        leader_linkedin: data.leaderLinkedin || '',
        leader_gender: data.leaderGender || '',
        team_code: teamCode,
        members: [memberProfile],
        skills: data.creatorSkills || [],
        team_name: data.team_name,
        logo: '🚀',
        description: data.description,
        goal: data.goal,
        project_name: data.project_name,
        comm_link: data.comm_link,
        opportunity_id: data.opportunity_id || '',
        opportunity_title: data.opportunity_title || '',
        interests: data.interests || [],
        achievements: [],
        rolesNeeded: data.rolesNeeded || [],
        openSlots: teamCapacity - 1,
        joinRequests: [],
        teamAnnouncements: [],
        resources: [],
        messages: [],
      }
      setTeams((list) => [team, ...list])
    }

    return { success: true, team }
  }

  // ---------- Join a team directly via its unique team code ----------
  // Unlike requestToJoinTeam (which needs leader approval), this adds the
  // member immediately — used by the "Join Team" tab where a teammate
  // types in the code the leader received after registering.
  const joinTeamByCode = async (code, memberInfo = {}, currentUser) => {
    const normalizedCode = (code || '').trim().toUpperCase()
    if (!normalizedCode) return { success: false, error: 'INVALID_CODE' }

    const team = teamsRef.current.find((t) => (t.team_code || '').toUpperCase() === normalizedCode)
    if (!team) return { success: false, error: 'INVALID_CODE' }

    const email = (memberInfo.email || '').trim()
    if (isEmailAlreadyRegistered(email)) return { success: false, error: 'ALREADY_REGISTERED' }

    const memberId = currentUser?.id || uid('user')
    if (team.members.some((m) => m.id === memberId)) return { success: false, error: 'ALREADY_MEMBER' }
    // Someone already leading/on another team for this same hackathon
    // shouldn't be able to join a second one here by simply typing a
    // different email — check by their actual account id, scoped to this
    // opportunity, the same way requestToJoinTeam already does.
    if (hasConflictingOpportunityTeam(memberId, team.opportunity_id)) {
      return { success: false, error: 'ALREADY_REGISTERED' }
    }
    if (remainingSlots(team) <= 0) return { success: false, error: 'TEAM_FULL' }

    const newMember = {
      id: memberId,
      name: memberInfo.name || 'Team member',
      email,
      contact: memberInfo.contact || '',
      role: memberInfo.role || '',
      skills: memberInfo.skills || [],
      isLeader: false,
      bio: '',
      experience: 'Intermediate',
      githubUrl: memberInfo.githubUrl || '',
      linkedinUrl: memberInfo.linkedinUrl || '',
      gender: memberInfo.gender || '',
      availability: 'Available',
    }

    if (isSupabaseConfigured) {
      await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: newMember.id,
        name: newMember.name,
        email: newMember.email,
        contact: newMember.contact,
        gender: newMember.gender,
        linkedin_url: newMember.linkedinUrl,
        github_url: newMember.githubUrl,
        is_leader: false,
        availability: newMember.availability,
        experience: newMember.experience,
      })
      await supabase.from('teams').update({ open_slots: Math.max(0, team.openSlots - 1) }).eq('id', team.id)
    } else {
      setTeams((list) =>
        list.map((t) =>
          t.id === team.id
            ? { ...t, members: [...t.members, newMember], openSlots: Math.max(0, t.openSlots - 1) }
            : t,
        ),
      )
    }

    addNotification(team.leader_id, {
      title: 'New member joined your team',
      message: `${newMember.name} joined ${team.team_name} using the team code.`,
      role: 'student',
      link: `/dashboard/student/teams/${team.id}`,
    })

    return { success: true, team }
  }

  const joinTeam = async (teamId, member) => {
    const team = getTeam(teamId)
    if (!team || team.members.some((m) => m.id === member.id) || remainingSlots(team) <= 0) return
    if (isSupabaseConfigured) {
      await supabase.from('team_members').insert({ team_id: teamId, user_id: member.id, name: member.full_name || member.name, is_leader: false })
      await supabase.from('teams').update({ open_slots: Math.max(0, team.openSlots - 1) }).eq('id', teamId)
    } else {
      setTeams((list) =>
        list.map((t) => {
          if (t.id !== teamId) return t
          if (t.members.some((m) => m.id === member.id)) return t
          if (t.openSlots <= 0) return t
          return { ...t, members: [...t.members, { ...member, isLeader: false }], openSlots: Math.max(0, t.openSlots - 1) }
        }),
      )
    }
    addNotification(team.leader_id, {
      title: 'New member joined your team',
      message: `${member?.full_name || member?.name || 'A student'} joined ${team.team_name}.`,
      role: 'student',
      link: `/dashboard/student/teams/${teamId}`,
    })
  }

  const assignLeader = async (teamId, memberId) => {
    const team = getTeam(teamId)
    const newLeader = team?.members.find((m) => m.id === memberId)
    if (!team || !newLeader) return
    if (isSupabaseConfigured) {
      await supabase.from('teams').update({ leader_id: memberId }).eq('id', teamId)
      await supabase.from('team_members').update({ is_leader: false }).eq('team_id', teamId)
      await supabase.from('team_members').update({ is_leader: true }).eq('team_id', teamId).eq('user_id', memberId)
    } else {
      setTeams((list) =>
        list.map((t) => {
          if (t.id !== teamId) return t
          if (!t.members.some((m) => m.id === memberId)) return t
          return { ...t, leader_id: newLeader.id, leader_name: newLeader.name, members: t.members.map((m) => ({ ...m, isLeader: m.id === memberId })) }
        }),
      )
    }
    addNotification(memberId, {
      title: "You're now the team leader 👑",
      message: `You've been made the leader of ${team.team_name}.`,
      role: 'student',
      link: `/dashboard/student/teams/${teamId}`,
    })
  }

  const updateTeamProfile = async (teamId, updates) => {
    if (isSupabaseConfigured) {
      const dbUpdates = { ...updates }
      if ('openSlots' in dbUpdates) dbUpdates.open_slots = dbUpdates.openSlots
      if ('rolesNeeded' in dbUpdates) dbUpdates.roles_needed = dbUpdates.rolesNeeded
      delete dbUpdates.openSlots
      delete dbUpdates.rolesNeeded
      await supabase.from('teams').update(dbUpdates).eq('id', teamId)
      return
    }
    setTeams((list) => list.map((t) => (t.id === teamId ? { ...t, ...updates } : t)))
  }

  const addTeamAchievement = async (teamId, title) => {
    if (!title?.trim()) return
    const team = getTeam(teamId)
    if (!team) return
    const achievement = { id: uid('ach'), title, date: new Date().toISOString() }
    const nextAchievements = [achievement, ...(team.achievements || [])]
    if (isSupabaseConfigured) {
      await supabase.from('teams').update({ achievements: nextAchievements }).eq('id', teamId)
    } else {
      setTeams((list) => list.map((t) => (t.id === teamId ? { ...t, achievements: nextAchievements } : t)))
    }
    team.members.forEach((m) =>
      addNotification(m.id, {
        title: `New achievement for ${team.team_name} 🏅`,
        message: title,
        role: 'student',
        link: `/dashboard/student/teams/${teamId}`,
      }),
    )
  }

  // ---------- Team join requests ----------
  // A student can only be registered with one team per hackathon/internship.
  // This checks both existing membership and any other pending request the
  // applicant already has out for the *same* opportunity — so someone can't
  // end up double-booked once a leader approves a second request.
  const hasConflictingOpportunityTeam = (applicantId, opportunityId) => {
    if (!opportunityId || !applicantId) return false
    return teamsRef.current.some((t) => {
      if (t.opportunity_id !== opportunityId) return false
      const isMember = t.members.some((m) => m.id === applicantId)
      const hasPendingRequest = (t.joinRequests || []).some((r) => r.user_id === applicantId && r.status === 'pending')
      return isMember || hasPendingRequest
    })
  }

  const requestToJoinTeam = async (teamId, applicant, { role, skills, message } = {}) => {
    const team = getTeam(teamId)
    if (!team) return { success: false, error: 'UNKNOWN' }
    if (team.members.some((m) => m.id === applicant?.id)) return { success: false, error: 'ALREADY_MEMBER' }
    if ((team.joinRequests || []).some((r) => r.user_id === applicant?.id && r.status === 'pending')) {
      return { success: false, error: 'ALREADY_REQUESTED' }
    }
    if (remainingSlots(team) <= 0) return { success: false, error: 'TEAM_FULL' }
    if (hasConflictingOpportunityTeam(applicant?.id, team.opportunity_id)) {
      return { success: false, error: 'ALREADY_REGISTERED' }
    }

    if (isSupabaseConfigured) {
      await supabase.from('team_join_requests').insert({
        team_id: teamId,
        user_id: applicant?.id,
        role,
        skills: skills || [],
        message: message || '',
      })
    } else {
      const request = {
        id: uid('jreq'),
        user_id: applicant?.id,
        user_name: applicant?.full_name,
        role,
        skills: skills || [],
        message: message || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      }
      setTeams((list) => list.map((t) => (t.id === teamId ? { ...t, joinRequests: [request, ...(t.joinRequests || [])] } : t)))
    }
    addNotification(team.leader_id, {
      title: 'New team join request',
      message: `${applicant?.full_name || 'A student'} asked to join ${team.team_name}.`,
      role: 'student',
      link: `/dashboard/student/teams/${teamId}`,
    })
    return { success: true }
  }

  const cancelJoinRequest = async (teamId, requestId) => {
    const team = getTeam(teamId)
    const request = team?.joinRequests?.find((r) => r.id === requestId)
    if (isSupabaseConfigured) {
      await supabase.from('team_join_requests').delete().eq('id', requestId)
    } else {
      setTeams((list) => list.map((t) => (t.id === teamId ? { ...t, joinRequests: (t.joinRequests || []).filter((r) => r.id !== requestId) } : t)))
    }
    if (team && request) {
      addNotification(team.leader_id, {
        title: 'Join request withdrawn',
        message: `${request.user_name || 'A student'} withdrew their request to join ${team.team_name}.`,
        role: 'student',
        link: `/dashboard/student/teams/${teamId}`,
      })
    }
  }

  const approveJoinRequest = async (teamId, requestId) => {
    const team = getTeam(teamId)
    const request = team?.joinRequests?.find((r) => r.id === requestId)
    if (!team || !request) return

    const alreadyOnAnotherTeamForThisOpportunity =
      team.opportunity_id &&
      teamsRef.current.some(
        (t) => t.id !== teamId && t.opportunity_id === team.opportunity_id && t.members.some((m) => m.id === request.user_id),
      )
    if (alreadyOnAnotherTeamForThisOpportunity) {
      if (isSupabaseConfigured) {
        await supabase.from('team_join_requests').update({ status: 'rejected' }).eq('id', requestId)
      } else {
        setTeams((list) =>
          list.map((t) =>
            t.id === teamId ? { ...t, joinRequests: t.joinRequests.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)) } : t,
          ),
        )
      }
      addNotification(request.user_id, {
        title: 'Join request could not be approved',
        message: `You're already registered with another team for this opportunity.`,
        role: 'student',
        link: '/dashboard/student/teams',
      })
      return
    }

    if (remainingSlots(team) <= 0) {
      if (isSupabaseConfigured) {
        await supabase.from('team_join_requests').update({ status: 'rejected' }).eq('id', requestId)
      } else {
        setTeams((list) =>
          list.map((t) =>
            t.id === teamId ? { ...t, joinRequests: t.joinRequests.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)) } : t,
          ),
        )
      }
      addNotification(request.user_id, {
        title: 'Team is now full',
        message: `${team.team_name} filled its open slots before your request could be approved.`,
        role: 'student',
        link: '/dashboard/student/teams',
      })
      return
    }

    const alreadyMember = team.members.some((m) => m.id === request.user_id)
    const newMember = {
      id: request.user_id,
      name: request.user_name,
      role: request.role,
      skills: request.skills,
      isLeader: false,
      bio: '',
      experience: 'Intermediate',
      availability: 'Available',
    }

    if (isSupabaseConfigured) {
      if (!alreadyMember) {
        await supabase.from('team_members').insert({
          team_id: teamId,
          user_id: newMember.id,
          name: newMember.name,
          role: newMember.role,
          skills: newMember.skills,
          is_leader: false,
        })
        await supabase.from('teams').update({ open_slots: Math.max(0, team.openSlots - 1) }).eq('id', teamId)
      }
      await supabase.from('team_join_requests').update({ status: 'accepted' }).eq('id', requestId)
    } else {
      setTeams((list) =>
        list.map((t) => {
          if (t.id !== teamId) return t
          if (t.members.some((m) => m.id === newMember.id)) {
            return { ...t, joinRequests: t.joinRequests.map((r) => (r.id === requestId ? { ...r, status: 'accepted' } : r)) }
          }
          return {
            ...t,
            members: [...t.members, newMember],
            openSlots: Math.max(0, t.openSlots - 1),
            joinRequests: t.joinRequests.map((r) => (r.id === requestId ? { ...r, status: 'accepted' } : r)),
          }
        }),
      )
    }

    // The team may already be an approved participant of a hackathon — if
    // so, a newly-joined member should immediately count toward that
    // opportunity's live participant total too.
    if (!alreadyMember && addMemberToAcceptedApplication) {
      addMemberToAcceptedApplication(teamId, newMember)
    }

    addNotification(request.user_id, {
      title: 'Join request accepted 🎉',
      message: `You're officially part of ${team.team_name}. Head to the team workspace to say hi.`,
      role: 'student',
      link: `/dashboard/student/teams/${teamId}`,
    })
  }

  const rejectJoinRequest = async (teamId, requestId) => {
    const team = getTeam(teamId)
    const request = team?.joinRequests?.find((r) => r.id === requestId)
    if (isSupabaseConfigured) {
      await supabase.from('team_join_requests').update({ status: 'rejected' }).eq('id', requestId)
    } else {
      setTeams((list) =>
        list.map((t) =>
          t.id === teamId ? { ...t, joinRequests: t.joinRequests.map((r) => (r.id === requestId ? { ...r, status: 'rejected' } : r)) } : t,
        ),
      )
    }
    if (team && request) {
      addNotification(request.user_id, {
        title: 'Join request update',
        message: `Your request to join ${team.team_name} wasn't accepted this time.`,
        role: 'student',
        link: '/dashboard/student/teams',
      })
    }
  }

  // ---------- Team member profiles ----------
  // Called from ProfileSettings.jsx after a profile save. team_members rows
  // are a snapshot taken at join/creation time (name, bio, skills, etc.), so
  // without this a profile edit would never show up on any team the person
  // is already part of. Unlike updateMemberProfile (which targets one known
  // team), this updates every team_members row for this user_id in a single
  // pass — the person could be on more than one team across different
  // hackathons/internships at once.
  const syncMemberProfileEverywhere = async (userId, updates) => {
    if (!userId) return
    if (isSupabaseConfigured) {
      const dbUpdates = { ...updates }
      if ('full_name' in dbUpdates) {
        dbUpdates.name = dbUpdates.full_name
        delete dbUpdates.full_name
      }
      if ('portfolioUrl' in dbUpdates) dbUpdates.portfolio_url = dbUpdates.portfolioUrl
      if ('githubUrl' in dbUpdates) dbUpdates.github_url = dbUpdates.githubUrl
      delete dbUpdates.portfolioUrl
      delete dbUpdates.githubUrl
      delete dbUpdates.projects
      delete dbUpdates.isLeader
      delete dbUpdates.college
      await supabase.from('team_members').update(dbUpdates).eq('user_id', userId)
      return
    }
    const localUpdates = { ...updates }
    if ('full_name' in localUpdates) {
      localUpdates.name = localUpdates.full_name
      delete localUpdates.full_name
    }
    delete localUpdates.college
    setTeams((list) =>
      list.map((t) => ({
        ...t,
        members: t.members.map((m) => (m.id === userId ? { ...m, ...localUpdates } : m)),
      })),
    )
  }

  const updateMemberProfile = async (teamId, memberId, updates) => {
    if (isSupabaseConfigured) {
      const dbUpdates = { ...updates }
      if ('portfolioUrl' in dbUpdates) dbUpdates.portfolio_url = dbUpdates.portfolioUrl
      if ('githubUrl' in dbUpdates) dbUpdates.github_url = dbUpdates.githubUrl
      delete dbUpdates.portfolioUrl
      delete dbUpdates.githubUrl
      delete dbUpdates.projects
      delete dbUpdates.isLeader
      await supabase.from('team_members').update(dbUpdates).eq('team_id', teamId).eq('user_id', memberId)
      return
    }
    setTeams((list) =>
      list.map((t) => (t.id === teamId ? { ...t, members: t.members.map((m) => (m.id === memberId ? { ...m, ...updates } : m)) } : t)),
    )
  }

  // ---------- Team workspace: announcements, resources, chat ----------
  const addTeamAnnouncement = async (teamId, data, author) => {
    const team = getTeam(teamId)
    if (!team) return undefined
    if (isSupabaseConfigured) {
      await supabase.from('team_announcements').insert({
        team_id: teamId,
        author_id: author?.id,
        author_name: author?.full_name || 'Team leader',
        title: data.title,
        content: data.content,
      })
    } else {
      const announcement = { id: uid('tann'), created_at: new Date().toISOString(), author_name: author?.full_name || 'Team leader', ...data }
      setTeams((list) => list.map((t) => (t.id === teamId ? { ...t, teamAnnouncements: [announcement, ...(t.teamAnnouncements || [])] } : t)))
    }
    team.members
      .filter((m) => m.id !== author?.id)
      .forEach((m) =>
        addNotification(m.id, {
          title: `New announcement in ${team.team_name}`,
          message: data.title,
          role: 'student',
          link: `/dashboard/student/teams/${teamId}`,
        }),
      )
  }

  const addTeamResource = async (teamId, data, author) => {
    const team = getTeam(teamId)
    if (isSupabaseConfigured) {
      await supabase.from('team_resources').insert({
        team_id: teamId,
        added_by_id: author?.id,
        added_by: author?.full_name || 'A teammate',
        name: data.name,
        url: data.url,
      })
    } else {
      const resource = { id: uid('tres'), created_at: new Date().toISOString(), added_by: author?.full_name || 'A teammate', ...data }
      setTeams((list) => list.map((t) => (t.id === teamId ? { ...t, resources: [resource, ...(t.resources || [])] } : t)))
    }
    team?.members
      .filter((m) => m.id !== author?.id)
      .forEach((m) =>
        addNotification(m.id, {
          title: `New resource shared in ${team.team_name}`,
          message: data.name,
          role: 'student',
          link: `/dashboard/student/teams/${teamId}`,
        }),
      )
  }

  const removeTeamResource = async (teamId, resourceId) => {
    if (isSupabaseConfigured) {
      await supabase.from('team_resources').delete().eq('id', resourceId)
      return
    }
    setTeams((list) => list.map((t) => (t.id === teamId ? { ...t, resources: (t.resources || []).filter((r) => r.id !== resourceId) } : t)))
  }

  const sendTeamMessage = async (teamId, text, sender, options = {}) => {
    const { type = 'text', attachment = null } = options
    if (!text?.trim() && !attachment) return undefined

    if (isSupabaseConfigured) {
      await supabase.from('team_messages').insert({
        team_id: teamId,
        sender_id: sender?.id,
        sender_name: sender?.full_name,
        text: (text || '').trim(),
        type,
        attachment,
      })
    } else {
      const message = {
        id: uid('tmsg'),
        text: (text || '').trim(),
        sender_id: sender?.id,
        sender_name: sender?.full_name,
        type,
        attachment,
        created_at: new Date().toISOString(),
      }
      setTeams((list) => list.map((t) => (t.id === teamId ? { ...t, messages: [...(t.messages || []), message] } : t)))
    }

    // A leader message flagged as an announcement also lands in the team's
    // Announcements tab, so both surfaces stay in sync.
    if (type === 'announcement') {
      await addTeamAnnouncement(teamId, { title: text.trim(), content: attachment ? `Shared file: ${attachment.name}` : '' }, sender)
      return
    }

    const team = getTeam(teamId)
    team?.members
      .filter((m) => m.id !== sender?.id)
      .forEach((m) =>
        addNotification(m.id, {
          title: `New message in ${team.team_name}`,
          message: attachment ? `${sender?.full_name || 'A teammate'} shared a file: ${attachment.name}` : `${sender?.full_name || 'A teammate'}: ${text.trim().slice(0, 60)}`,
          role: 'student',
          link: `/dashboard/student/teams/${teamId}`,
        }),
      )
  }

  return {
    teams,
    getTeam,
    createTeam,
    joinTeam,
    joinTeamByCode,
    assignLeader,
    updateTeamProfile,
    addTeamAchievement,
    requestToJoinTeam,
    cancelJoinRequest,
    approveJoinRequest,
    rejectJoinRequest,
    updateMemberProfile,
    syncMemberProfileEverywhere,
    addTeamAnnouncement,
    addTeamResource,
    removeTeamResource,
    sendTeamMessage,
  }
}

export function TeamsProvider({ children, deps }) {
  const value = useTeamsModule(deps)
  const memoized = useMemo(() => value, [value.teams])
  return <TeamsContext.Provider value={memoized}>{children}</TeamsContext.Provider>
}

export function useTeams() {
  const ctx = useContext(TeamsContext)
  if (!ctx) throw new Error('useTeams must be used within TeamsProvider')
  return ctx
}
