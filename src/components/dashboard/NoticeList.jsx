import { Megaphone } from 'lucide-react'
import { formatDate } from '../../lib/utils'

export default function NoticeList({ notices = [], accent = 'student', emptyText = 'No notices yet — check back closer to the date.' }) {
  if (!notices.length) {
    return <p className="rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/30">{emptyText}</p>
  }

  const accentText = { student: 'text-student', volunteer: 'text-volunteer', organizer: 'text-organizer' }[accent]
  const accentSoft = { student: 'bg-student-soft', volunteer: 'bg-volunteer-soft', organizer: 'bg-organizer-soft' }[accent]

  return (
    <div className="space-y-3">
      {notices.map((n) => (
        <div key={n.id} className="flex gap-3 rounded-xl border border-bg-border bg-white/[0.02] px-4 py-3.5">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accentSoft} ${accentText}`}>
            <Megaphone size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">{n.title}</p>
            <p className="mt-1 text-xs text-white/45">{n.content}</p>
            <p className="mt-1.5 text-[11px] text-white/30">{formatDate(n.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
