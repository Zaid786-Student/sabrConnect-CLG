import { createContext, useContext, useEffect, useMemo } from 'react'
import { supabase, isSupabaseConfigured, subscribeTable, applyRealtimeChange } from '../../lib/supabaseClient'
import { useLocalTable } from '../../lib/localStore'
import { uid } from '../../lib/utils'

export const NotificationsContext = createContext(null)

const NOTIFS_KEY = 'sabrconnect.notifications'
const MAIL_KEY = 'sabrconnect.mailLog'

function fromDbNotification(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    message: row.message,
    role: row.role,
    link: row.link,
    read: row.read,
    created_at: row.created_at,
  }
}

// Exported as a standalone hook so other modules (applications, teams,
// social, ...) can call `addNotification` / `sendMail` without importing
// React Context machinery — they receive it as a plain argument from
// DataProvider, which is the only place this hook is actually mounted.
export function useNotificationsModule() {
  const [notifications, setNotifications] = useLocalTable(NOTIFS_KEY, [])
  const [mailLog, setMailLog] = useLocalTable(MAIL_KEY, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true
    supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (active && data) setNotifications(data.map(fromDbNotification))
      })
    const unsubscribe = subscribeTable('notifications', (payload) => {
      setNotifications((prev) => applyRealtimeChange(prev, payload, fromDbNotification))
    })
    return () => {
      active = false
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addNotification = async (userId, { title, message, role = 'info', link = '' } = {}) => {
    if (!userId) return undefined
    if (isSupabaseConfigured) {
      // Deliberately NOT .select() here: the notification's owner is
      // `userId`, almost never the person calling addNotification (an
      // organizer notifying a student, a student notifying an organizer,
      // ...). Postgres enforces the SELECT policy on rows returned from
      // INSERT ... RETURNING too, and our SELECT policy only lets a user
      // see their *own* notifications — so trying to read the row back
      // here would fail RLS even though the insert itself is fine.
      // The recipient picks this row up on their own via their initial
      // fetch + realtime subscription; the sender doesn't need it locally.
      const { error } = await supabase.from('notifications').insert({ user_id: userId, title, message, role, link })
      if (error) {
        // eslint-disable-next-line no-console
        console.error('addNotification failed', error)
        return undefined
      }
      return { user_id: userId, title, message, role, link }
    }
    const notification = {
      id: uid('notif'),
      user_id: userId,
      title,
      message,
      role,
      link,
      read: false,
      created_at: new Date().toISOString(),
    }
    setNotifications((list) => [notification, ...list])
    return notification
  }

  const markNotificationRead = async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
      if (error) return
    }
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllNotificationsRead = async (userId) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
      if (error) return
    }
    setNotifications((list) => list.map((n) => (n.user_id === userId ? { ...n, read: true } : n)))
  }

  const clearAllNotifications = async (userId) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
      if (error) return
    }
    setNotifications((list) => list.filter((n) => n.user_id !== userId))
  }

  // ---------- Mail (simulated) ----------
  // Stands in for a real email provider. In Supabase mode this logs to the
  // Writes to the mail_log table either way (visible to any signed-in user,
  // e.g. for a support/admin view) AND, when Supabase is configured, also
  // invokes the send-mail Edge Function to actually deliver real email via
  // Resend. If that function isn't deployed yet, or RESEND_API_KEY hasn't
  // been set as a secret, it just fails quietly here and the mail_log row
  // above is still the record of what "was sent" — see
  // supabase/functions/send-mail/index.ts for one-time setup instructions.
  const sendMail = async ({ to, toName, subject, body }) => {
    const mail = { id: uid('mail'), to, toName, subject, body, sent_at: new Date().toISOString() }
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('mail_log')
        .insert({ to_email: to, to_name: toName, subject, body })
      if (error) {
        // eslint-disable-next-line no-console
        console.error('sendMail failed', error)
      }
      try {
        const { error: fnError } = await supabase.functions.invoke('send-mail', {
          body: { to, toName, subject, body },
        })
        if (fnError) {
          // eslint-disable-next-line no-console
          console.warn('Real email delivery not sent (send-mail function not set up yet?)', fnError)
        }
      } catch (fnErr) {
        // eslint-disable-next-line no-console
        console.warn('Real email delivery not sent (send-mail function not set up yet?)', fnErr)
      }
    } else {
      setMailLog((list) => [mail, ...list])
    }
    // eslint-disable-next-line no-console
    console.info(`[SabrConnect Mail] To: ${to || toName}\nSubject: ${subject}\n\n${body}`)
    return mail
  }

  return {
    notifications,
    mailLog,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
    sendMail,
  }
}

export function NotificationsProvider({ children }) {
  const value = useNotificationsModule()
  const memoized = useMemo(() => value, [value.notifications, value.mailLog])
  return <NotificationsContext.Provider value={memoized}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
