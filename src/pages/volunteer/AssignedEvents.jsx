import { useNavigate } from 'react-router-dom'
import { CalendarDays, ListChecks, ChevronRight } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../lib/utils'

export default function AssignedEvents() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { hackathons, volunteerTasks, volunteerSignups } = useData()

  const taskEventIds = new Set(volunteerTasks.filter((t) => t.volunteer_id === user?.id).map((t) => t.event_id))
  const signedUpIds = new Set(
    volunteerSignups.filter((s) => s.volunteer_id === user?.id && s.status === 'accepted').map((s) => s.hackathon_id),
  )
  const eventIds = new Set([...taskEventIds, ...signedUpIds])
  const events = hackathons.filter((h) => eventIds.has(h.id))

  return (
    <DashboardShell role="volunteer" title="Assigned Events" subtitle="Events you're supporting as a volunteer. Click one for full details.">
      <div className="grid gap-5 md:grid-cols-2">
        {events.map((e) => {
          const tasks = volunteerTasks.filter((t) => t.event_id === e.id && t.volunteer_id === user?.id)
          return (
            <Card
              key={e.id}
              className="cursor-pointer transition-colors hover:border-white/20"
              onClick={() => navigate(`/dashboard/volunteer/hackathons/${e.id}`)}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-display text-base font-semibold">{e.title}</h3>
                <ChevronRight size={16} className="mt-0.5 shrink-0 text-white/30" />
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
                <CalendarDays size={13} /> {formatDate(e.start_date)} – {formatDate(e.end_date)}
              </p>
              <p className="mt-3 text-sm text-white/45 line-clamp-2">{e.description}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-white/40">
                <ListChecks size={13} /> {tasks.length} task{tasks.length === 1 ? '' : 's'} assigned to you
              </div>
            </Card>
          )
        })}
        {events.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-sm text-white/30">
            You're not assigned to any events yet. Head to Find Hackathons to sign up.
          </p>
        )}
      </div>
    </DashboardShell>
  )
}
