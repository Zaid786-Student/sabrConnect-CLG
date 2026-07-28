import { useNavigate } from 'react-router-dom'
import { Users2 } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../lib/utils'

const statusVariant = { accepted: 'success', in_review: 'warning', submitted: 'info', rejected: 'neutral' }
const statusLabel = { accepted: 'Accepted', in_review: 'In Review', submitted: 'Submitted', rejected: 'Rejected' }

export default function Applications() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { applications } = useData()
  // Include applications this student submitted themselves, plus team
  // applications where they're a member (even if a teammate submitted it).
  const mine = applications.filter(
    (a) => a.user_id === user?.id || (a.members || []).some((m) => m.id === user?.id),
  )

  return (
    <DashboardShell role="student" title="Applications" subtitle="Track the status of everything you've applied to.">
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-bg-border text-xs uppercase tracking-wide text-white/35">
              <th className="px-6 py-4 font-medium">Opportunity</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Applied</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((a) => (
              <tr
                key={a.id}
                className="cursor-pointer border-b border-bg-border last:border-0 hover:bg-white/[0.03]"
                onClick={() => navigate(`/dashboard/student/${a.opportunity_type}s/${a.opportunity_id}`)}
              >
                <td className="px-6 py-4 font-medium">
                  {a.title}
                  {a.team_id && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-bg-border bg-white/[0.04] px-2 py-0.5 text-[10px] font-normal text-white/45">
                      <Users2 size={10} /> {a.team_name} · {a.member_count}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 capitalize text-white/50">{a.opportunity_type}</td>
                <td className="px-6 py-4 text-white/50">{formatDate(a.created_at)}</td>
                <td className="px-6 py-4">
                  <Badge variant={statusVariant[a.status]}>{statusLabel[a.status]}</Badge>
                </td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-sm text-white/30">
                  You haven't applied to anything yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </DashboardShell>
  )
}
