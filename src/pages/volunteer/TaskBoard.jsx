import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, cn } from '../../lib/utils'

const columns = [
  { key: 'pending', label: 'Pending', accent: 'border-organizer/30' },
  { key: 'in_progress', label: 'In Progress', accent: 'border-volunteer/30' },
  { key: 'completed', label: 'Completed', accent: 'border-student/30' },
]

const priorityVariant = { high: 'warning', medium: 'info', low: 'neutral' }

export default function TaskBoard() {
  const { user } = useAuth()
  const { volunteerTasks: allTasks, updateTaskStatus } = useData()
  const tasks = allTasks.filter((t) => t.volunteer_id === user?.id)

  const advance = (id) => {
    const order = ['pending', 'in_progress', 'completed']
    const current = tasks.find((t) => t.id === id)
    if (!current) return
    const next = order[Math.min(order.indexOf(current.status) + 1, order.length - 1)]
    updateTaskStatus(id, next)
  }

  return (
    <DashboardShell role="volunteer" title="Task Board" subtitle="Move tasks forward as you complete them.">
      <div className="grid gap-5 md:grid-cols-3">
        {columns.map((col) => (
          <div key={col.key}>
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-white/70">{col.label}</h3>
              <span className="text-xs text-white/30">{tasks.filter((t) => t.status === col.key).length}</span>
            </div>
            <div className="space-y-3">
              {tasks
                .filter((t) => t.status === col.key)
                .map((t) => (
                  <Card key={t.id} className={cn('border-t-2', col.accent)}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{t.title}</p>
                      <Badge variant={priorityVariant[t.priority]}>{t.priority}</Badge>
                    </div>
                    <p className="mt-1.5 text-xs text-white/40">{t.event_title}</p>
                    <p className="mt-1 text-xs text-white/30">Due {formatDate(t.deadline)}</p>
                    {t.status !== 'completed' && (
                      <button
                        onClick={() => advance(t.id)}
                        className="mt-3 text-xs font-medium text-white/60 hover:text-white"
                      >
                        Mark as {t.status === 'pending' ? 'In Progress' : 'Completed'} →
                      </button>
                    )}
                  </Card>
                ))}
              {tasks.filter((t) => t.status === col.key).length === 0 && (
                <p className="rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/25">
                  Nothing here yet.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  )
}
