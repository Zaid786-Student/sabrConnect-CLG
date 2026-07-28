import { createContext, useContext, useEffect, useMemo } from 'react'
import { supabase, isSupabaseConfigured, subscribeTable, applyRealtimeChange } from '../../lib/supabaseClient'
import { useLocalTable, readLocal } from '../../lib/localStore'
import { uid } from '../../lib/utils'
import { seedAnnouncements } from '../../data/mockData'

export const AnnouncementsContext = createContext(null)
const KEY = 'sabrconnect.announcements'
// Same key AuthContext stores mock-mode accounts under — read directly
// rather than importing AuthContext, to avoid a cross-context import cycle.
const USERS_KEY = 'sabrconnect.users'

export function useAnnouncementsModule({ addNotification } = {}) {
  const [announcements, setAnnouncements] = useLocalTable(KEY, seedAnnouncements)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true
    supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active && data) setAnnouncements(data)
      })
    const unsubscribe = subscribeTable('announcements', (payload) => {
      setAnnouncements((prev) => applyRealtimeChange(prev, payload))
    })
    return () => {
      active = false
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Notifies every student/volunteer — the audience field is descriptive
  // only for now (no create-announcement form actually sets it to anything
  // other than 'All'), so this broadcasts broadly rather than silently
  // under-notifying based on an unused filter.
  const notifyAudience = async (announcement) => {
    if (!addNotification) return
    let recipientIds = []
    if (isSupabaseConfigured) {
      const { data } = await supabase.from('profiles').select('id').neq('role', 'organizer')
      recipientIds = (data || []).map((p) => p.id)
    } else {
      recipientIds = readLocal(USERS_KEY, [])
        .filter((u) => u.role !== 'organizer')
        .map((u) => u.id)
    }
    recipientIds.forEach((id) =>
      addNotification(id, {
        title: 'New announcement',
        message: announcement.title,
        role: 'student',
        link: '/dashboard/student/announcements',
      }),
    )
  }

  const addAnnouncement = async (data, organizer) => {
    const draft = {
      organizer_id: organizer?.id || 'you',
      organizer_name: organizer?.full_name || 'You',
      audience: 'All',
      ...data,
    }
    let announcement
    if (isSupabaseConfigured) {
      const { data: row, error } = await supabase.from('announcements').insert(draft).select().single()
      if (error) {
        // eslint-disable-next-line no-console
        console.error('addAnnouncement failed', error)
        return undefined
      }
      announcement = row
      setAnnouncements((list) => [row, ...list])
    } else {
      announcement = { id: uid('ann'), created_at: new Date().toISOString(), ...draft }
      setAnnouncements((list) => [announcement, ...list])
    }
    notifyAudience(announcement)
    return announcement
  }

  return { announcements, addAnnouncement }
}

export function AnnouncementsProvider({ children, deps }) {
  const value = useAnnouncementsModule(deps)
  const memoized = useMemo(() => value, [value.announcements])
  return <AnnouncementsContext.Provider value={memoized}>{children}</AnnouncementsContext.Provider>
}

export function useAnnouncements() {
  const ctx = useContext(AnnouncementsContext)
  if (!ctx) throw new Error('useAnnouncements must be used within AnnouncementsProvider')
  return ctx
}
