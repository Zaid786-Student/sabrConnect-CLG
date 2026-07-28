import { useEffect, useRef, useState } from 'react'
import { publish, subscribe } from './realtimeBus'
import { supabase, isSupabaseConfigured } from './supabaseClient'

const TYPING_TIMEOUT_MS = 3000

// Global "who's online" presence, shared app-wide.
// Returns a map of userId -> { id, name, ts }.
//
// When Supabase is configured, this uses Supabase Realtime Presence, which
// works across real separate users/devices/browsers — not just tabs on the
// same machine. Falls back to the localStorage bus in local/demo mode.
export function usePresence(user) {
  const [online, setOnline] = useState({})

  useEffect(() => {
    if (!user?.id) return undefined

    if (isSupabaseConfigured && supabase) {
      const channel = supabase.channel('presence:global', {
        config: { presence: { key: user.id } },
      })

      const syncOnlineFromState = () => {
        const state = channel.presenceState()
        const next = {}
        Object.entries(state).forEach(([id, entries]) => {
          const latest = entries[entries.length - 1]
          next[id] = { id, name: latest?.name, ts: Date.now() }
        })
        setOnline(next)
      }

      channel
        .on('presence', { event: 'sync' }, syncOnlineFromState)
        .on('presence', { event: 'join' }, syncOnlineFromState)
        .on('presence', { event: 'leave' }, syncOnlineFromState)
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ name: user.full_name, online_at: new Date().toISOString() })
          }
        })

      return () => {
        supabase.removeChannel(channel)
      }
    }

    // --- Local/demo fallback (same-browser tabs only) ---
    const HEARTBEAT_MS = 4000
    const PRESENCE_TIMEOUT_MS = 11000
    setOnline({ [user.id]: { id: user.id, name: user.full_name, ts: Date.now() } })
    const unsubscribe = subscribe('presence', (p) => {
      setOnline((prev) => ({ ...prev, [p.id]: p }))
    })
    const beat = () => publish('presence', { id: user.id, name: user.full_name, ts: Date.now() })
    beat()
    const heartbeat = setInterval(beat, HEARTBEAT_MS)
    const sweep = setInterval(() => {
      setOnline((prev) => {
        const now = Date.now()
        const next = {}
        Object.values(prev).forEach((p) => {
          if (p.id === user.id || now - p.ts < PRESENCE_TIMEOUT_MS) next[p.id] = p
        })
        return next
      })
    }, 3000)
    return () => {
      clearInterval(heartbeat)
      clearInterval(sweep)
      unsubscribe()
    }
  }, [user?.id, user?.full_name])

  return online
}

// Per-channel typing indicator (channelId can be a team id, or a DM
// conversation id). Returns { typingNames, notifyTyping, notifyStopTyping }.
export function useTyping(channelId, user) {
  const [typing, setTyping] = useState({}) // id -> name
  const timeouts = useRef({})
  const channelRef = useRef(null)

  useEffect(() => {
    if (!channelId) return undefined

    const handleEvent = ({ id, name, stop }) => {
      if (id === user?.id) return // ignore our own broadcasts
      clearTimeout(timeouts.current[id])
      if (stop) {
        setTyping((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        return
      }
      setTyping((prev) => ({ ...prev, [id]: name }))
      timeouts.current[id] = setTimeout(() => {
        setTyping((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }, TYPING_TIMEOUT_MS)
    }

    if (isSupabaseConfigured && supabase) {
      const channel = supabase.channel(`typing:${channelId}`)
      channel.on('broadcast', { event: 'typing' }, ({ payload }) => handleEvent(payload)).subscribe()
      channelRef.current = channel
      return () => {
        supabase.removeChannel(channel)
        channelRef.current = null
        Object.values(timeouts.current).forEach(clearTimeout)
      }
    }

    const unsubscribe = subscribe(`typing:${channelId}`, handleEvent)
    return () => {
      unsubscribe()
      Object.values(timeouts.current).forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, user?.id])

  const notifyTyping = () => {
    if (!channelId || !user?.id) return
    const payload = { id: user.id, name: user.full_name }
    if (isSupabaseConfigured && channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload })
    } else {
      publish(`typing:${channelId}`, payload)
    }
  }
  const notifyStopTyping = () => {
    if (!channelId || !user?.id) return
    const payload = { id: user.id, name: user.full_name, stop: true }
    if (isSupabaseConfigured && channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'typing', payload })
    } else {
      publish(`typing:${channelId}`, payload)
    }
  }

  return { typingNames: Object.values(typing), notifyTyping, notifyStopTyping }
}
