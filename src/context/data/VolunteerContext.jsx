import { createContext, useContext, useEffect, useMemo } from 'react'
import { supabase, isSupabaseConfigured, subscribeTable, applyRealtimeChange } from '../../lib/supabaseClient'
import { useLocalTable } from '../../lib/localStore'
import { uid } from '../../lib/utils'
import { seedVolunteerTasks, seedVolunteerSignups } from '../../data/mockData'

export const VolunteerContext = createContext(null)
const TASKS_KEY = 'sabrconnect.volunteerTasks'
const SIGNUPS_KEY = 'sabrconnect.volunteerSignups'

export function useVolunteerModule({ addNotification, sendMail, getHackathon }) {
  const [volunteerTasks, setVolunteerTasks] = useLocalTable(TASKS_KEY, seedVolunteerTasks)
  const [volunteerSignups, setVolunteerSignups] = useLocalTable(SIGNUPS_KEY, seedVolunteerSignups)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true
    Promise.all([
      supabase.from('volunteer_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('volunteer_signups').select('*').order('created_at', { ascending: false }),
    ]).then(([{ data: taskRows }, { data: signupRows }]) => {
      if (!active) return
      if (taskRows) setVolunteerTasks(taskRows)
      if (signupRows) setVolunteerSignups(signupRows)
    })
    const unsubTasks = subscribeTable('volunteer_tasks', (payload) => {
      setVolunteerTasks((prev) => applyRealtimeChange(prev, payload))
    })
    const unsubSignups = subscribeTable('volunteer_signups', (payload) => {
      setVolunteerSignups((prev) => applyRealtimeChange(prev, payload))
    })
    return () => {
      active = false
      unsubTasks()
      unsubSignups()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateTaskStatus = async (taskId, status) => {
    const task = volunteerTasks.find((t) => t.id === taskId)
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('volunteer_tasks').update({ status }).eq('id', taskId)
      if (error) return
    }
    setVolunteerTasks((list) => list.map((t) => (t.id === taskId ? { ...t, status } : t)))

    if (task && status === 'completed') {
      const hackathon = getHackathon?.(task.event_id)
      if (hackathon?.organizer_id) {
        addNotification(hackathon.organizer_id, {
          title: 'Volunteer task completed',
          message: `"${task.title}" was marked complete for ${hackathon.title}.`,
          role: 'organizer',
          link: '/dashboard/organizer/events',
        })
      }
    }
  }

  const addVolunteerTask = async (data) => {
    let task
    if (isSupabaseConfigured) {
      const { data: row, error } = await supabase
        .from('volunteer_tasks')
        .insert({ status: 'pending', priority: 'medium', ...data })
        .select()
        .single()
      if (error) {
        // eslint-disable-next-line no-console
        console.error('addVolunteerTask failed', error)
        return undefined
      }
      task = row
      setVolunteerTasks((list) => [row, ...list])
    } else {
      task = { id: uid('task'), status: 'pending', priority: 'medium', ...data }
      setVolunteerTasks((list) => [task, ...list])
    }
    if (task.volunteer_id) {
      addNotification(task.volunteer_id, {
        title: 'New task assigned',
        message: task.title,
        role: 'volunteer',
        link: '/dashboard/volunteer/tasks',
      })
    }
    return task
  }

  const isVolunteeringFor = (userId, hackathonId) =>
    volunteerSignups.some((s) => s.volunteer_id === userId && s.hackathon_id === hackathonId)

  const getVolunteerSignup = (userId, hackathonId) =>
    volunteerSignups.find((s) => s.volunteer_id === userId && s.hackathon_id === hackathonId)

  const volunteerSignUp = async (hackathon, volunteer) => {
    if (isVolunteeringFor(volunteer?.id, hackathon.id)) return undefined
    const draft = {
      hackathon_id: hackathon.id,
      hackathon_title: hackathon.title,
      organizer_id: hackathon.organizer_id,
      volunteer_id: volunteer?.id,
      volunteer_name: volunteer?.full_name,
      volunteer_email: volunteer?.email,
      status: 'pending',
    }
    let signup
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('volunteer_signups').insert(draft).select().single()
      if (error) {
        // eslint-disable-next-line no-console
        console.error('volunteerSignUp failed', error)
        return undefined
      }
      signup = data
      setVolunteerSignups((list) => [signup, ...list])
    } else {
      signup = { id: uid('vsignup'), created_at: new Date().toISOString(), ...draft }
      setVolunteerSignups((list) => [signup, ...list])
    }
    addNotification(hackathon.organizer_id, {
      title: 'New volunteer request',
      message: `${volunteer?.full_name || 'A volunteer'} asked to volunteer for ${hackathon.title}.`,
      role: 'organizer',
      link: '/dashboard/organizer/events',
    })
    return signup
  }

  const setVolunteerSignupStatus = async (signupId, status) => {
    const target = volunteerSignups.find((s) => s.id === signupId)
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('volunteer_signups').update({ status }).eq('id', signupId)
      if (error) return
    }
    setVolunteerSignups((list) => list.map((s) => (s.id === signupId ? { ...s, status } : s)))

    if (target && status === 'accepted') {
      sendMail({
        to: target.volunteer_email,
        toName: target.volunteer_name,
        subject: `You're confirmed to volunteer for ${target.hackathon_title}`,
        body: `Hi ${target.volunteer_name || 'there'},\n\nYou have successfully enrolled in ${target.hackathon_title} as a volunteer. The organizing team has approved your request.\n\nYou'll start receiving task assignments on your dashboard shortly.\n\n— SabrConnect`,
      })
      addNotification(target.volunteer_id, {
        title: 'Volunteer request accepted 🎉',
        message: `You've successfully enrolled in ${target.hackathon_title} as a volunteer. Check your email for confirmation.`,
        role: 'volunteer',
        link: '/dashboard/volunteer/events',
      })
    } else if (target && status === 'rejected') {
      addNotification(target.volunteer_id, {
        title: 'Volunteer request update',
        message: `Your request to volunteer for ${target.hackathon_title} was declined.`,
        role: 'volunteer',
        link: '/dashboard/volunteer/hackathons',
      })
    }
  }

  return {
    volunteerTasks,
    volunteerSignups,
    updateTaskStatus,
    addVolunteerTask,
    isVolunteeringFor,
    getVolunteerSignup,
    volunteerSignUp,
    setVolunteerSignupStatus,
  }
}

export function VolunteerProvider({ children, deps }) {
  const value = useVolunteerModule(deps)
  const memoized = useMemo(() => value, [value.volunteerTasks, value.volunteerSignups])
  return <VolunteerContext.Provider value={memoized}>{children}</VolunteerContext.Provider>
}

export function useVolunteer() {
  const ctx = useContext(VolunteerContext)
  if (!ctx) throw new Error('useVolunteer must be used within VolunteerProvider')
  return ctx
}
