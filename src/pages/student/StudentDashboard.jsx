import { Link, useNavigate } from 'react-router-dom'
import { Trophy, Briefcase, Users, ClipboardList, ArrowRight, CalendarClock, Sparkles, Target } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card, StatCard } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, daysUntil } from '../../lib/utils'

const statusVariant = { accepted: 'success', in_review: 'warning', submitted: 'info', rejected: 'neutral' }
const statusLabel = { accepted: 'Accepted', in_review: 'In Review', submitted: 'Submitted', rejected: 'Rejected' }

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { hackathons, internships, teams, applications } = useData()

  const myTeams = teams.filter((t) => t.members.some((m) => m.id === user?.id))
  const myApplications = applications.filter((a) => a.user_id === user?.id)

  const deadlines = [...hackathons, ...internships]
    .map((o) => ({ id: o.id, type: o.deadline ? 'internships' : 'hackathons', title: o.title, date: o.end_date || o.deadline }))
    .filter((o) => o.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4)

  return (
    <DashboardShell role="student" title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'Student'}`} subtitle="Here's what's happening across your opportunities.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button className="text-left" onClick={() => navigate('/dashboard/student/hackathons')}>
          <StatCard label="Featured Hackathons" value={hackathons.length} icon={Trophy} accent="organizer" />
        </button>
        <button className="text-left" onClick={() => navigate('/dashboard/student/internships')}>
          <StatCard label="Featured Internships" value={internships.length} icon={Briefcase} accent="student" />
        </button>
        <button className="text-left" onClick={() => navigate('/dashboard/student/teams')}>
          <StatCard label="My Teams" value={myTeams.length} icon={Users} accent="volunteer" />
        </button>
        <button className="text-left" onClick={() => navigate('/dashboard/student/applications')}>
          <StatCard label="My Applications" value={myApplications.length} icon={ClipboardList} accent="student" />
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button
          className="group flex items-center gap-4 rounded-2xl border border-student/30 bg-student-soft px-5 py-4 text-left transition-colors hover:border-student/50"
          onClick={() => navigate('/dashboard/student/team-matcher')}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-student/20 text-student">
            <Sparkles size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-student">AI Team Matcher</p>
            <p className="mt-0.5 text-xs text-white/50">Find teammates who complement your skills.</p>
          </div>
          <ArrowRight size={16} className="shrink-0 text-student opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
        <button
          className="group flex items-center gap-4 rounded-2xl border border-volunteer/30 bg-volunteer-soft px-5 py-4 text-left transition-colors hover:border-volunteer/50"
          onClick={() => navigate('/dashboard/student/recommendations')}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-volunteer/20 text-volunteer">
            <Target size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-volunteer">AI Recommendations</p>
            <p className="mt-0.5 text-xs text-white/50">Opportunities ranked to fit your profile.</p>
          </div>
          <ArrowRight size={16} className="shrink-0 text-volunteer opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recommended for you</h2>
            <Link to="/dashboard/student/hackathons" className="flex items-center gap-1 text-sm text-white/40 hover:text-white">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-3">
            {hackathons.map((h) => (
              <div
                key={h.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-bg-border bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/20"
                onClick={() => navigate(`/dashboard/student/hackathons/${h.id}`)}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{h.title}</p>
                  <p className="mt-0.5 truncate text-xs text-white/40">{h.organizer_name} · {formatDate(h.start_date)}</p>
                </div>
                <Badge variant="organizer" className="ml-3 shrink-0 capitalize">{h.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center gap-2">
            <CalendarClock size={16} className="text-student" />
            <h2 className="font-display text-lg font-semibold">Upcoming Deadlines</h2>
          </div>
          <div className="space-y-4">
            {deadlines.map((d) => {
              const days = daysUntil(d.date)
              return (
                <div
                  key={d.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-1 py-1 hover:bg-white/[0.03]"
                  onClick={() => navigate(`/dashboard/student/${d.type}/${d.id}`)}
                >
                  <p className="truncate text-sm text-white/70">{d.title}</p>
                  <span className="shrink-0 font-mono text-xs text-white/40">
                    {days > 0 ? `${days}d left` : 'closed'}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">My Teams</h2>
            <Link to="/dashboard/student/teams" className="flex items-center gap-1 text-sm text-white/40 hover:text-white">
              Manage <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-3">
            {myTeams.map((t) => (
              <div
                key={t.id}
                className="cursor-pointer rounded-xl border border-bg-border bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/20"
                onClick={() => navigate('/dashboard/student/teams')}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t.team_name}</p>
                  <span className="text-xs text-white/40">{t.members.length} members</span>
                </div>
                <p className="mt-1 text-xs text-white/40">{t.description}</p>
              </div>
            ))}
            {myTeams.length === 0 && (
              <p className="rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/25">
                You haven't joined a team yet.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent Applications</h2>
            <Link to="/dashboard/student/applications" className="flex items-center gap-1 text-sm text-white/40 hover:text-white">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-3">
            {myApplications.map((a) => (
              <div
                key={a.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-bg-border bg-white/[0.02] px-4 py-3.5 transition-colors hover:border-white/20"
                onClick={() => navigate(`/dashboard/student/${a.opportunity_type}s/${a.opportunity_id}`)}
              >
                <p className="truncate text-sm text-white/70">{a.title}</p>
                <Badge variant={statusVariant[a.status]}>{statusLabel[a.status]}</Badge>
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
