import { useState } from 'react'
import { Check, X, GraduationCap, HeartHandshake, Users2 } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, initials } from '../../lib/utils'

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

export default function Approvals() {
  const { user } = useAuth()
  const {
    applications, hackathons, internships, setApplicationStatus,
    volunteerSignups, setVolunteerSignupStatus,
  } = useData()
  const [tab, setTab] = useState('pending')

  // Only requests tied to events this organizer created.
  const myEventIds = new Set([
    ...hackathons.filter((h) => h.organizer_id === user?.id).map((h) => h.id),
    ...internships.filter((i) => i.organizer_id === user?.id).map((i) => i.id),
  ])
  const myHackathonIds = new Set(hackathons.filter((h) => h.organizer_id === user?.id).map((h) => h.id))

  // Normalize both applications (student) and volunteer signups into one shape.
  const studentRequests = applications
    .filter((a) => myEventIds.has(a.opportunity_id))
    .map((a) => ({
      id: `app-${a.id}`,
      raw_id: a.id,
      kind: 'student',
      name: a.team_id ? (a.team_name || 'Team') : (a.user_name || `Student #${(a.user_id || '').slice(-4)}`),
      subtitle: a.title,
      created_at: a.created_at,
      status: a.status === 'submitted' || a.status === 'in_review' ? 'pending' : a.status,
    }))

  const volunteerRequests = volunteerSignups
    .filter((s) => myHackathonIds.has(s.hackathon_id))
    .map((s) => ({
      id: `vol-${s.id}`,
      raw_id: s.id,
      kind: 'volunteer',
      name: s.volunteer_name || 'Volunteer',
      subtitle: s.hackathon_title,
      created_at: s.created_at,
      status: s.status === 'accepted' ? 'approved' : s.status,
    }))

  const all = [...studentRequests, ...volunteerRequests].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  )

  const pending = all.filter((r) => r.status === 'pending')
  const approved = all.filter((r) => r.status === 'approved' || r.status === 'accepted')
  const rejected = all.filter((r) => r.status === 'rejected')
  const visible = { pending, approved, rejected }[tab]

  const handleDecision = (request, status) => {
    const dbStatus = status === 'approved' ? 'accepted' : status
    if (request.kind === 'student') {
      setApplicationStatus(request.raw_id, dbStatus)
    } else {
      setVolunteerSignupStatus(request.raw_id, dbStatus)
    }
  }

  return (
    <DashboardShell
      role="organizer"
      title="Approvals"
      subtitle="All pending requests — student applications and volunteer sign-ups — for the events you created."
    >
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-bg-border bg-white/[0.02] p-1.5">
        {TABS.map((t) => {
          const count = { pending, approved, rejected }[t.id].length
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                tab === t.id ? 'bg-organizer-soft text-organizer' : 'text-white/55 hover:text-white'
              }`}
            >
              {t.label} ({count})
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((r) => {
          const RoleIcon = r.kind === 'student' ? GraduationCap : HeartHandshake
          return (
            <Card key={r.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-organizer-soft text-xs font-semibold text-organizer">
                  {r.kind === 'student' && r.name === 'Team' ? <Users2 size={16} /> : initials(r.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="truncate text-xs text-white/40">{r.subtitle}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] capitalize text-white/45">
                      <RoleIcon size={11} /> {r.kind}
                    </span>
                    <Badge variant={r.status === 'pending' ? 'warning' : r.status === 'rejected' ? 'neutral' : 'success'} className="text-[10px] capitalize">
                      {r.status}
                    </Badge>
                    <span className="text-[11px] text-white/30">{formatDate(r.created_at)}</span>
                  </div>
                </div>
              </div>
              {r.status === 'pending' && (
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleDecision(r, 'approved')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-student/30 bg-student-soft text-student hover:brightness-110"
                    aria-label="Accept"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleDecision(r, 'rejected')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-bg-border text-white/40 hover:text-red-400"
                    aria-label="Reject"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </Card>
          )
        })}
        {visible.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-sm text-white/30">
            {tab === 'pending' && 'No pending requests right now.'}
            {tab === 'approved' && 'No approved requests yet.'}
            {tab === 'rejected' && 'Nothing rejected yet.'}
          </p>
        )}
      </div>
    </DashboardShell>
  )
}