import { useNavigate } from 'react-router-dom'
import { CalendarDays, Users2, Check, MapPin } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../lib/utils'

export default function Hackathons() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { hackathons, getApplication } = useData()

  return (
    <DashboardShell role="student" title="Hackathons" subtitle="Discover and apply to live hackathons.">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {hackathons.map((h) => {
          const isApplied = Boolean(getApplication(user?.id, h.id))
          return (
            <Card
              key={h.id}
              className="flex cursor-pointer flex-col transition-colors hover:border-white/20"
              onClick={() => navigate(`/dashboard/student/hackathons/${h.id}`)}
            >
              <div className="mb-3 flex items-center justify-between">
                <Badge variant="organizer" className="capitalize">{h.status}</Badge>
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <Users2 size={12} /> {h.participants}
                </span>
              </div>
              <h3 className="font-display text-base font-semibold leading-snug">{h.title}</h3>
              <p className="mt-1 text-xs text-white/40">{h.organizer_name}</p>
              <p className="mt-2 flex-1 text-sm text-white/45 line-clamp-2">{h.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(h.tags || []).map((tag) => (
                  <span key={tag} className="rounded-full border border-bg-border px-2.5 py-1 text-xs text-white/45">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-white/40">
                <CalendarDays size={13} /> {formatDate(h.start_date)} – {formatDate(h.end_date)}
              </div>
              {h.location && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-white/40">
                  <MapPin size={13} /> {h.location}
                </div>
              )}
              <Button
                variant={isApplied ? 'outline' : 'primary'}
                className={isApplied ? 'mt-5 w-full !border-volunteer/40 !text-volunteer hover:!bg-volunteer-soft' : 'mt-5 w-full'}
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/dashboard/student/hackathons/${h.id}`)
                }}
              >
                {isApplied ? (
                  <>
                    <Check size={15} /> Details
                  </>
                ) : (
                  'Apply Now'
                )}
              </Button>
            </Card>
          )
        })}
        {hackathons.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-sm text-white/30">
            No hackathons published yet — check back soon.
          </p>
        )}
      </div>
    </DashboardShell>
  )
}
