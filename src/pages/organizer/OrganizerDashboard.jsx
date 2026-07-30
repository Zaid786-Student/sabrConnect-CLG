import { Link, useNavigate } from 'react-router-dom'
import { Trophy, Users, ClipboardCheck, ArrowRight, Plus } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card, StatCard } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../lib/utils'

export default function OrganizerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { hackathons, internships, applications } = useData()

  const myHackathons = hackathons.filter((h) => h.organizer_id === user?.id)
  const myInternships = internships.filter((i) => i.organizer_id === user?.id)
  const myEventIds = new Set([...myHackathons.map((h) => h.id), ...myInternships.map((i) => i.id)])
  const myApplications = applications.filter((a) => myEventIds.has(a.opportunity_id))
  const pendingRequests = myApplications.filter((a) => a.status === 'submitted' || a.status === 'in_review').length

  // "Total Participants" = everyone actually approved into one of this
  // organizer's events (hackathons + internships), team members included.
  const totalParticipants =
    myHackathons.reduce((sum, h) => sum + (h.participants || 0), 0) +
    myInternships.reduce((sum, i) => sum + (i.participants || 0), 0)

  // "Live Events" = every event this organizer has published that hasn't
  // been explicitly closed/completed — a hackathon defaults to 'open' the
  // moment it's created, so it counts here right away instead of needing a
  // manual status flip first.
  const isLive = (status) => !['completed', 'closed', 'cancelled'].includes(status)
  const liveHackathons = myHackathons.filter((h) => isLive(h.status))
  const liveInternships = myInternships.filter((i) => isLive(i.status))
  const openEvents = liveHackathons.length + liveInternships.length
  const ongoingEvents = [
    ...liveHackathons.map((h) => ({ ...h, kind: 'hackathon' })),
    ...liveInternships.map((i) => ({ ...i, start_date: i.deadline, status: i.status || 'open', kind: 'internship' })),
  ].sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0))

  return (
    <DashboardShell
      role="organizer"
      title={`${user?.full_name || 'Organizer'}`}
      subtitle="Full control over your innovation programs."
    >
      <div className="mb-6 flex justify-end">
        <Button onClick={() => navigate('/dashboard/organizer/events')}>
          <Plus size={16} /> Create Event
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button className="text-left" onClick={() => navigate('/dashboard/organizer/events')}>
          <StatCard label="Live Events" value={openEvents} icon={Trophy} accent="organizer" />
        </button>
        <button className="text-left" onClick={() => navigate('/dashboard/organizer/events')}>
          <StatCard label="Total Participants" value={totalParticipants} icon={Users} accent="student" />
        </button>
        <button className="text-left" onClick={() => navigate('/dashboard/organizer/participants')}>
          <StatCard label="Pending Requests" value={pendingRequests} icon={ClipboardCheck} accent="volunteer" />
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Ongoing Events</h2>
            <Link to="/dashboard/organizer/events" className="flex items-center gap-1 text-sm text-white/40 hover:text-white">
              Manage all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-3">
            {ongoingEvents.map((e) => (
              <div
                key={e.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-bg-border bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/20"
                onClick={() => navigate(`/dashboard/organizer/events/${e.kind}/${e.id}`)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="mt-0.5 truncate text-xs text-white/40">{formatDate(e.start_date)}</p>
                </div>
                <Badge variant="organizer" className="ml-3 shrink-0 capitalize">{e.status}</Badge>
              </div>
            ))}
            {ongoingEvents.length === 0 && (
              <p className="rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/25">
                No ongoing events. Create one to get started.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Applications Queue</h2>
            <Link to="/dashboard/organizer/participants" className="flex items-center gap-1 text-sm text-white/40 hover:text-white">
              Review <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-4">
            {myApplications.map((a) => (
              <div
                key={a.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1 hover:bg-white/[0.03]"
                onClick={() => navigate('/dashboard/organizer/participants')}
              >
                <p className="truncate text-sm text-white/70">{a.title}</p>
                <span className="shrink-0 text-xs capitalize text-white/40">{a.status.replace('_', ' ')}</span>
              </div>
            ))}
            {myApplications.length === 0 && (
              <p className="rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/25">
                No applications yet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </DashboardShell>
  )
}
