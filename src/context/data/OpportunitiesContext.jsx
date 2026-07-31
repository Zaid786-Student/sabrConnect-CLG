import { createContext, useContext, useEffect, useMemo } from 'react'
import { supabase, isSupabaseConfigured, subscribeTable, applyRealtimeChange } from '../../lib/supabaseClient'
import { useLocalTable } from '../../lib/localStore'
import { uid } from '../../lib/utils'
import { seedHackathons, seedInternships } from '../../data/mockData'

export const OpportunitiesContext = createContext(null)

const HACKATHONS_KEY = 'sabrconnect.hackathons'
const INTERNSHIPS_KEY = 'sabrconnect.internships'

function attachNotices(rows, noticesByTarget) {
  return rows.map((row) => ({ ...row, notices: noticesByTarget[row.id] || [] }))
}

function groupNotices(notices) {
  return notices.reduce((acc, n) => {
    acc[n.target_id] = acc[n.target_id] || []
    acc[n.target_id].push({ id: n.id, title: n.title, content: n.content, created_at: n.created_at })
    return acc
  }, {})
}

export function useOpportunitiesModule({ addNotification, getApplicantIdsForOpportunity } = {}) {
  const [hackathons, setHackathons] = useLocalTable(HACKATHONS_KEY, seedHackathons)
  const [internships, setInternships] = useLocalTable(INTERNSHIPS_KEY, seedInternships)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true

    const load = async () => {
      const [{ data: hackRows }, { data: intRows }, { data: noticeRows }] = await Promise.all([
        supabase.from('hackathons').select('*').order('created_at', { ascending: false }),
        supabase.from('internships').select('*').order('created_at', { ascending: false }),
        supabase.from('notices').select('*'),
      ])
      if (!active) return
      const byTarget = groupNotices(noticeRows || [])
      if (hackRows) setHackathons(attachNotices(hackRows, byTarget))
      if (intRows) setInternships(attachNotices(intRows, byTarget))
    }
    load()

    // Hackathon/internship row changes merge directly; notice changes are
    // rare enough that a full reload keeps the merge logic simple and correct.
    const unsubHack = subscribeTable('hackathons', (payload) => {
      setHackathons((prev) => applyRealtimeChange(prev, payload, (row) => ({ ...row, notices: prev.find((h) => h.id === row.id)?.notices || [] })))
    })
    const unsubInt = subscribeTable('internships', (payload) => {
      setInternships((prev) => applyRealtimeChange(prev, payload, (row) => ({ ...row, notices: prev.find((i) => i.id === row.id)?.notices || [] })))
    })
    const unsubNotices = subscribeTable('notices', () => load())

    return () => {
      active = false
      unsubHack()
      unsubInt()
      unsubNotices()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- Hackathons ----------
  const addHackathon = async (data, organizer) => {
    const base = {
      status: 'open',
      participants: 0,
      registration_deadline: data.start_date || '',
      organizer_id: organizer?.id || 'you',
      organizer_name: organizer?.full_name || 'You',
      ...data,
    }
    if (isSupabaseConfigured) {
      const { notices: _n, ...insertable } = base
      // Date columns reject an empty string ('') with a Postgres error —
      // this is why publishing a hackathon with any date field left blank
      // used to fail silently (the insert errored, but nothing told the
      // organizer). Blank dates are sent as null instead.
      ;['start_date', 'end_date', 'registration_deadline'].forEach((key) => {
        if (insertable[key] === '') insertable[key] = null
      })
      // Same empty-string-breaks-the-column issue applies to the int
      // columns used for the organizer's team setup — normalize here too
      // in case a caller ever sends these as raw strings.
      ;['team_size', 'min_female_members'].forEach((key) => {
        if (insertable[key] === '') insertable[key] = null
        else if (typeof insertable[key] === 'string') insertable[key] = Number(insertable[key])
      })
      const { data: row, error } = await supabase.from('hackathons').insert(insertable).select().single()
      if (error) {
        // eslint-disable-next-line no-console
        console.error('addHackathon failed', error)
        return { success: false, error: error.message }
      }
      const hackathon = { ...row, notices: [] }
      setHackathons((list) => [hackathon, ...list])
      return { success: true, hackathon }
    }
    const hackathon = { id: uid('hack'), tags: [], notices: [], ...base }
    setHackathons((list) => [hackathon, ...list])
    return { success: true, hackathon }
  }

  const updateHackathon = async (hackathonId, updates) => {
    const clean = { ...updates }
    ;['start_date', 'end_date', 'registration_deadline'].forEach((key) => {
      if (clean[key] === '') clean[key] = null
    })
    ;['team_size', 'min_female_members'].forEach((key) => {
      if (clean[key] === '') clean[key] = null
      else if (typeof clean[key] === 'string') clean[key] = Number(clean[key])
    })
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('hackathons').update(clean).eq('id', hackathonId)
      if (error) {
        // eslint-disable-next-line no-console
        console.error('updateHackathon failed', error)
        return { success: false, error: error.message }
      }
    }
    setHackathons((list) => list.map((h) => (h.id === hackathonId ? { ...h, ...clean } : h)))
    return { success: true }
  }

  const addHackathonNotice = async (hackathonId, notice) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('notices')
        .insert({ target_type: 'hackathon', target_id: hackathonId, title: notice.title, content: notice.content })
        .select()
        .single()
      if (error) return
      setHackathons((list) =>
        list.map((h) => (h.id === hackathonId ? { ...h, notices: [data, ...(h.notices || [])] } : h)),
      )
    } else {
      setHackathons((list) =>
        list.map((h) =>
          h.id === hackathonId
            ? { ...h, notices: [{ id: uid('notice'), created_at: new Date().toISOString(), ...notice }, ...(h.notices || [])] }
            : h,
        ),
      )
    }
    const hackathon = hackathons.find((h) => h.id === hackathonId)
    getApplicantIdsForOpportunity?.(hackathonId).forEach((userId) =>
      addNotification?.(userId, {
        title: `New update: ${hackathon?.title || 'a hackathon you applied to'}`,
        message: notice.title,
        role: 'student',
        link: `/dashboard/student/hackathons/${hackathonId}`,
      }),
    )
  }

  // ---------- Internships ----------
  const addInternship = async (data, organizer) => {
    const base = {
      status: 'open',
      participants: 0,
      organizer_id: organizer?.id || 'you',
      organizer_name: organizer?.full_name || 'You',
      ...data,
    }
    if (isSupabaseConfigured) {
      const { notices: _n, ...insertable } = base
      // Same issue as hackathons: an empty-string deadline breaks the date
      // column and fails the insert with no visible error to the organizer.
      if (insertable.deadline === '') insertable.deadline = null
      const { data: row, error } = await supabase.from('internships').insert(insertable).select().single()
      if (error) {
        // eslint-disable-next-line no-console
        console.error('addInternship failed', error)
        return { success: false, error: error.message }
      }
      const internship = { ...row, notices: [] }
      setInternships((list) => [internship, ...list])
      return { success: true, internship }
    }
    const internship = { id: uid('int'), notices: [], ...base }
    setInternships((list) => [internship, ...list])
    return { success: true, internship }
  }

  const updateInternship = async (internshipId, updates) => {
    const clean = { ...updates }
    if (clean.deadline === '') clean.deadline = null
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('internships').update(clean).eq('id', internshipId)
      if (error) {
        // eslint-disable-next-line no-console
        console.error('updateInternship failed', error)
        return { success: false, error: error.message }
      }
    }
    setInternships((list) => list.map((i) => (i.id === internshipId ? { ...i, ...clean } : i)))
    return { success: true }
  }

  const addInternshipNotice = async (internshipId, notice) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('notices')
        .insert({ target_type: 'internship', target_id: internshipId, title: notice.title, content: notice.content })
        .select()
        .single()
      if (error) return
      setInternships((list) =>
        list.map((i) => (i.id === internshipId ? { ...i, notices: [data, ...(i.notices || [])] } : i)),
      )
    } else {
      setInternships((list) =>
        list.map((i) =>
          i.id === internshipId
            ? { ...i, notices: [{ id: uid('notice'), created_at: new Date().toISOString(), ...notice }, ...(i.notices || [])] }
            : i,
        ),
      )
    }
    const internship = internships.find((i) => i.id === internshipId)
    getApplicantIdsForOpportunity?.(internshipId).forEach((userId) =>
      addNotification?.(userId, {
        title: `New update: ${internship?.title || 'an internship you applied to'}`,
        message: notice.title,
        role: 'student',
        link: `/dashboard/student/internships/${internshipId}`,
      }),
    )
  }

  // Adjust an opportunity's live participant count. Only ever called when an
  // application's status transitions into/out of 'accepted'.
  const adjustParticipantCount = async (type, opportunityId, delta) => {
    if (!delta) return
    if (type === 'internship') {
      const current = internships.find((o) => o.id === opportunityId)
      const next = Math.max(0, (current?.participants || 0) + delta)
      if (isSupabaseConfigured) {
        await supabase.from('internships').update({ participants: next }).eq('id', opportunityId)
      }
      setInternships((list) => list.map((o) => (o.id === opportunityId ? { ...o, participants: next } : o)))
    } else {
      const current = hackathons.find((o) => o.id === opportunityId)
      const next = Math.max(0, (current?.participants || 0) + delta)
      if (isSupabaseConfigured) {
        await supabase.from('hackathons').update({ participants: next }).eq('id', opportunityId)
      }
      setHackathons((list) => list.map((o) => (o.id === opportunityId ? { ...o, participants: next } : o)))
    }
  }

  return {
    hackathons,
    internships,
    addHackathon,
    updateHackathon,
    addHackathonNotice,
    addInternship,
    updateInternship,
    addInternshipNotice,
    adjustParticipantCount,
  }
}

export function OpportunitiesProvider({ children, deps }) {
  const value = useOpportunitiesModule(deps)
  const memoized = useMemo(() => value, [value.hackathons, value.internships])
  return <OpportunitiesContext.Provider value={memoized}>{children}</OpportunitiesContext.Provider>
}

export function useOpportunities() {
  const ctx = useContext(OpportunitiesContext)
  if (!ctx) throw new Error('useOpportunities must be used within OpportunitiesProvider')
  return ctx
}
