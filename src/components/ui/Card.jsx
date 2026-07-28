import { cn } from '../../lib/utils'

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('card p-6', className)} {...props}>
      {children}
    </div>
  )
}

const accentClasses = {
  student: { soft: 'bg-student-soft', text: 'text-student' },
  volunteer: { soft: 'bg-volunteer-soft', text: 'text-volunteer' },
  organizer: { soft: 'bg-organizer-soft', text: 'text-organizer' },
}

export function StatCard({ label, value, icon: Icon, accent = 'student' }) {
  const classes = accentClasses[accent] || accentClasses.student
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', classes.soft)}>
        {Icon && <Icon size={20} className={classes.text} />}
      </div>
      <div>
        <p className="text-2xl font-display font-semibold leading-none">{value}</p>
        <p className="mt-1.5 text-sm text-white/50">{label}</p>
      </div>
    </Card>
  )
}
