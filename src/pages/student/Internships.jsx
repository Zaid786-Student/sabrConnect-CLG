import { useNavigate } from 'react-router-dom'
import { MapPin, Wallet, Check, Clock } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, daysUntil } from '../../lib/utils'

export default function Internships() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { internships, getApplication } = useData()

  return (
    <DashboardShell role="student" title="Internships" subtitle="Roles matched to your skills profile.">
      <div className="space-y-4">
        {internships.map((i) => {
          const isApplied = Boolean(getApplication(user?.id, i.id))
          const days = daysUntil(i.deadline)
          return (
            <Card
              key={i.id}
              className="flex cursor-pointer flex-col justify-between gap-4 transition-colors hover:border-white/20 sm:flex-row sm:items-center"
              onClick={() => navigate(`/dashboard/student/internships/${i.id}`)}
            >
              <div className="flex min-w-0 gap-4">
                {i.thumbnail_url && (
                  <img src={i.thumbnail_url} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-bg-border object-cover" />
                )}
                <div className="min-w-0">
                <h3 className="font-display text-base font-semibold">{i.title}</h3>
                <p className="text-sm text-white/45">{i.company}</p>
                <p className="mt-2 max-w-lg text-sm text-white/40 line-clamp-2">{i.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} /> {i.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Wallet size={13} /> {i.stipend}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} /> {days > 0 ? `${days}d left` : 'Closed'} · {formatDate(i.deadline)}
                  </span>
                </div>
                </div>
              </div>
              <Button
                variant={isApplied ? 'outline' : 'primary'}
                className={isApplied ? 'shrink-0 !border-volunteer/40 !text-volunteer hover:!bg-volunteer-soft' : 'shrink-0'}
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/dashboard/student/internships/${i.id}`)
                }}
              >
                {isApplied && <Check size={15} />} Details
              </Button>
            </Card>
          )
        })}
        {internships.length === 0 && (
          <p className="rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-sm text-white/30">
            No internships published yet — check back soon.
          </p>
        )}
      </div>
    </DashboardShell>
  )
}
