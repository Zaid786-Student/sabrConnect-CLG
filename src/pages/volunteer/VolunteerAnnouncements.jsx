import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { Megaphone } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../lib/utils'

export default function VolunteerAnnouncements() {
  const { announcements } = useData()
  return (
    <DashboardShell role="volunteer" title="Announcements" subtitle="Updates from organizers you're supporting.">
      <div className="space-y-4">
        {announcements.map((a) => (
          <Card key={a.id} className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-volunteer-soft text-volunteer">
              <Megaphone size={17} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{a.title}</h3>
                <Badge variant="neutral">{a.audience}</Badge>
              </div>
              <p className="mt-1.5 text-sm text-white/50">{a.content}</p>
              <p className="mt-2 text-xs text-white/30">{a.organizer_name} · {formatDate(a.created_at)}</p>
            </div>
          </Card>
        ))}
      </div>
    </DashboardShell>
  )
}
