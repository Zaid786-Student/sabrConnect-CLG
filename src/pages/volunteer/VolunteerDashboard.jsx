import { Link, useNavigate } from 'react-router-dom'
import { ClipboardList, CalendarClock, CheckCircle2, ArrowRight, Megaphone, Compass } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card, StatCard } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../lib/utils'

const statusVariant = { pending: 'warning', in_progress: 'info', completed: 'success' }
const statusLabel = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }

export default function VolunteerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { volunteerTasks: allTasks, volunteerSignups, announcements } = useData()
  const volunteerTasks = allTasks.filter((t) => t.volunteer_id === user?.id)
  const pending = volunteerTasks.filter((t) => t.status !== 'completed').length
  const completed = volunteerTasks.filter((t) => t.status === 'completed').length
  const myAcceptedSignups = volunteerSignups.filter((s) => s.volunteer_id === user?.id && s.status === 'accepted')
  const events = new Set(myAcceptedSignups.map((s) => s.hackathon_id)).size

  return (
    <DashboardShell
      role="volunteer"
      title={`Hey, ${user?.full_name?.split(' ')[0] || 'Volunteer'}`}
      subtitle="Here's what needs your attention today."
    >
      <div className="mb-6 flex justify-end">
        <Button onClick={() => navigate('/dashboard/volunteer/hackathons')}>
          <Compass size={16} /> Find New Hackathons
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <button className="text-left" onClick={() => navigate('/dashboard/volunteer/events')}>
          <StatCard label="Assigned Events" value={events} icon={CalendarClock} accent="volunteer" />
        </button>
        <button className="text-left" onClick={() => navigate('/dashboard/volunteer/tasks')}>
          <StatCard label="Open Tasks" value={pending} icon={ClipboardList} accent="organizer" />
        </button>
        <button className="text-left" onClick={() => navigate('/dashboard/volunteer/tasks')}>
          <StatCard label="Completed Tasks" value={completed} icon={CheckCircle2} accent="student" />
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Task Board</h2>
            <Link to="/dashboard/volunteer/tasks" className="flex items-center gap-1 text-sm text-white/40 hover:text-white">
              Open board <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-3">
            {volunteerTasks.map((t) => (
              <div
                key={t.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-bg-border bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/20"
                onClick={() => navigate('/dashboard/volunteer/tasks')}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="mt-0.5 truncate text-xs text-white/40">{t.event_title} · Due {formatDate(t.deadline)}</p>
                </div>
                <Badge variant={statusVariant[t.status]} className="ml-3 shrink-0">
                  {statusLabel[t.status]}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center gap-2">
            <Megaphone size={16} className="text-volunteer" />
            <h2 className="font-display text-lg font-semibold">Announcements</h2>
          </div>
          <div className="space-y-4">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="cursor-pointer rounded-lg px-1 py-1 hover:bg-white/[0.03]"
                onClick={() => navigate('/dashboard/volunteer/announcements')}
              >
                <p className="text-sm font-medium">{a.title}</p>
                <p className="mt-1 text-xs text-white/40">{a.organizer_name} · {formatDate(a.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  )
}
