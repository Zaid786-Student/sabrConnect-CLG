import { useState } from 'react'
import { Check, X, Users2 } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../lib/utils'

const statusVariant = { accepted: 'success', in_review: 'warning', submitted: 'info', rejected: 'neutral' }

const TABS = [
  { id: 'requests', label: 'Requests' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
]

export default function Participants() {
  const { user } = useAuth()
  const { applications, hackathons, internships, setApplicationStatus } = useData()
  const [tab, setTab] = useState('requests')

  // Only show requests that came in for events this organizer created.
  const myEventIds = new Set([
    ...hackathons.filter((h) => h.organizer_id === user?.id).map((h) => h.id),
    ...internships.filter((i) => i.organizer_id === user?.id).map((i) => i.id),
  ])
  const myApplications = applications.filter((a) => myEventIds.has(a.opportunity_id))

  const requests = myApplications.filter((a) => a.status === 'submitted' || a.status === 'in_review')
  const approved = myApplications.filter((a) => a.status === 'accepted')
  const rejected = myApplications.filter((a) => a.status === 'rejected')
  const visible = { requests, approved, rejected }[tab]

  const setStatus = (id, status) => setApplicationStatus(id, status)

  return (
    <DashboardShell role="organizer" title="Participant Management" subtitle="Review and decide on applications to the events you created.">
      <div className="mb-5 flex flex-wrap gap-1.5 rounded-xl border border-bg-border bg-white/[0.02] p-1.5">
        {TABS.map((t) => {
          const count = { requests, approved, rejected }[t.id].length
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

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-bg-border text-xs uppercase tracking-wide text-white/35">
              <th className="px-6 py-4 font-medium">Applicant</th>
              <th className="px-6 py-4 font-medium">Opportunity</th>
              <th className="px-6 py-4 font-medium">Submitted</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr key={a.id} className="border-b border-bg-border last:border-0 align-top">
                <td className="px-6 py-4 font-medium">
                  {a.team_id ? (
                    <div>
                      <p className="flex items-center gap-1.5">
                        <Users2 size={13} className="text-organizer" /> {a.team_name || 'Team'}
                        <span className="font-normal text-white/40">· {a.member_count} member{a.member_count === 1 ? '' : 's'}</span>
                      </p>
                      <p className="mt-1 text-xs font-normal text-white/40">
                        {(a.members || []).map((m) => m.name).filter(Boolean).join(', ')}
                      </p>
                    </div>
                  ) : (
                    a.user_name || `Student #${(a.user_id || '').slice(-4)}`
                  )}
                </td>
                <td className="px-6 py-4 text-white/60">{a.title}</td>
                <td className="px-6 py-4 text-white/50">{formatDate(a.created_at)}</td>
                <td className="px-6 py-4">
                  <Badge variant={statusVariant[a.status]} className="capitalize">
                    {a.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  {a.status === 'submitted' || a.status === 'in_review' ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setStatus(a.id, 'accepted')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-student/30 bg-student-soft text-student hover:brightness-110"
                        aria-label="Accept"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setStatus(a.id, 'rejected')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-bg-border text-white/40 hover:text-red-400"
                        aria-label="Reject"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-right text-xs text-white/25">Decision final</p>
                  )}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-white/30">
                  {tab === 'requests' && 'No pending requests right now.'}
                  {tab === 'approved' && 'No approved participants yet.'}
                  {tab === 'rejected' && 'Nothing rejected yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </DashboardShell>
  )
}
