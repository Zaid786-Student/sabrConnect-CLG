import { useState } from 'react'
import { Check, X, Clock, ClipboardList } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, initials } from '../../lib/utils'

const statusVariant = { pending: 'warning', in_progress: 'info', completed: 'success' }

export default function Volunteers() {
  const { user } = useAuth()
  const { hackathons, volunteerSignups, volunteerTasks, setVolunteerSignupStatus, addVolunteerTask } = useData()
  const [assigningId, setAssigningId] = useState(null)
  const [taskForm, setTaskForm] = useState({ title: '', deadline: '', priority: 'medium', eventId: '' })

  // Only requests/volunteers tied to hackathons this organizer created.
  const myHackathonIds = new Set(hackathons.filter((h) => h.organizer_id === user?.id).map((h) => h.id))
  const mySignups = volunteerSignups.filter((s) => myHackathonIds.has(s.hackathon_id))

  const pending = mySignups.filter((s) => s.status === 'pending')
  const approvedSignups = mySignups.filter((s) => s.status === 'accepted')

  // Group approved signups by volunteer so each person shows once with their events + tasks
  const byVolunteer = new Map()
  approvedSignups.forEach((s) => {
    if (!byVolunteer.has(s.volunteer_id)) {
      byVolunteer.set(s.volunteer_id, { id: s.volunteer_id, name: s.volunteer_name || 'Volunteer', events: [] })
    }
    byVolunteer.get(s.volunteer_id).events.push({ id: s.hackathon_id, title: s.hackathon_title })
  })
  const volunteers = Array.from(byVolunteer.values())

  const [taskError, setTaskError] = useState('')

  const submitTask = async (e, volunteer) => {
    e.preventDefault()
    setTaskError('')
    if (!taskForm.title.trim() || !taskForm.eventId) return
    const chosenEvent = volunteer.events.find((ev) => ev.id === taskForm.eventId)
    const result = await addVolunteerTask({
      volunteer_id: volunteer.id,
      event_id: taskForm.eventId,
      event_title: chosenEvent?.title || '',
      title: taskForm.title.trim(),
      deadline: taskForm.deadline || null,
      priority: taskForm.priority,
    })
    if (!result) {
      setTaskError('Could not assign the task. Please try again.')
      return
    }
    setTaskForm({ title: '', deadline: '', priority: 'medium', eventId: '' })
    setAssigningId(null)
  }

  return (
    <DashboardShell role="organizer" title="Volunteer Management" subtitle="Approve requests and manage volunteers for the events you created.">
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Clock size={16} className="text-organizer" />
          <h2 className="font-display text-base font-semibold">Awaiting Your Approval</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {pending.map((s) => (
            <Card key={s.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-organizer-soft text-xs font-semibold text-organizer">
                  {initials(s.volunteer_name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.volunteer_name || 'Volunteer'}</p>
                  <p className="truncate text-xs text-white/40">{s.hackathon_title}</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setVolunteerSignupStatus(s.id, 'accepted')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-student/30 bg-student-soft text-student hover:brightness-110"
                  aria-label="Accept"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => setVolunteerSignupStatus(s.id, 'rejected')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-bg-border text-white/40 hover:text-red-400"
                  aria-label="Reject"
                >
                  <X size={14} />
                </button>
              </div>
            </Card>
          ))}
          {pending.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/25">
              No pending volunteer requests right now.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-display text-base font-semibold">Approved Volunteers</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {volunteers.map((v) => {
            const tasks = volunteerTasks.filter((t) => t.volunteer_id === v.id)
            const isAssigning = assigningId === v.id
            return (
              <Card key={v.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-organizer-soft text-sm font-semibold text-organizer">
                      {initials(v.name)}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{v.name}</p>
                      <p className="text-xs text-white/40">{v.events.map((ev) => ev.title).join(', ')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAssigningId(isAssigning ? null : v.id)
                      setTaskForm({ title: '', deadline: '', priority: 'medium', eventId: v.events[0]?.id || '' })
                    }}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-organizer/30 bg-organizer-soft px-3 py-1.5 text-xs font-medium text-organizer hover:brightness-110"
                  >
                    <ClipboardList size={13} /> {isAssigning ? 'Cancel' : 'Assign Task'}
                  </button>
                </div>
                <div className="mt-4 space-y-2.5">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-bg-border bg-white/[0.02] px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-white/80">{t.title}</p>
                        <p className="text-[11px] text-white/35">{t.event_title}{t.deadline ? ` · Due ${formatDate(t.deadline)}` : ''}</p>
                      </div>
                      <Badge variant={statusVariant[t.status]}>{t.status.replace('_', ' ')}</Badge>
                    </div>
                  ))}
                  {tasks.length === 0 && !isAssigning && <p className="text-xs text-white/25">No tasks assigned yet.</p>}
                </div>

                {isAssigning && (
                  <form onSubmit={(e) => submitTask(e, v)} className="mt-4 space-y-3 border-t border-bg-border pt-4">
                    {v.events.length > 1 && (
                      <select
                        value={taskForm.eventId}
                        onChange={(ev) => setTaskForm((f) => ({ ...f, eventId: ev.target.value }))}
                        className="w-full rounded-lg border border-bg-border bg-white/[0.02] px-3 py-2 text-sm text-white/80 focus:border-organizer/40 focus:outline-none"
                      >
                        {v.events.map((ev) => (
                          <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                      </select>
                    )}
                    <Input
                      placeholder="Task title (e.g. Manage check-in desk)"
                      required
                      value={taskForm.title}
                      onChange={(ev) => setTaskForm((f) => ({ ...f, title: ev.target.value }))}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="date"
                        value={taskForm.deadline}
                        onChange={(ev) => setTaskForm((f) => ({ ...f, deadline: ev.target.value }))}
                        className="w-full rounded-lg border border-bg-border bg-white/[0.02] px-3 py-2 text-sm text-white/80 focus:border-organizer/40 focus:outline-none"
                      />
                      <select
                        value={taskForm.priority}
                        onChange={(ev) => setTaskForm((f) => ({ ...f, priority: ev.target.value }))}
                        className="w-full rounded-lg border border-bg-border bg-white/[0.02] px-3 py-2 text-sm text-white/80 focus:border-organizer/40 focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    {taskError && <p className="text-xs text-red-400">{taskError}</p>}
                    <Button type="submit" className="!py-2 text-xs">Assign Task</Button>
                  </form>
                )}
              </Card>
            )
          })}
          {volunteers.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-sm text-white/30">
              No one has been approved to volunteer yet.
            </p>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
