import { cn } from '../../lib/utils'

const variants = {
  student: 'border-student/30 bg-student-soft text-student',
  volunteer: 'border-volunteer/30 bg-volunteer-soft text-volunteer',
  organizer: 'border-organizer/30 bg-organizer-soft text-organizer',
  neutral: 'border-bg-border bg-white/[0.04] text-white/60',
  success: 'border-student/30 bg-student-soft text-student',
  warning: 'border-organizer/30 bg-organizer-soft text-organizer',
  info: 'border-volunteer/30 bg-volunteer-soft text-volunteer',
}

export default function Badge({ variant = 'neutral', children, className }) {
  return <span className={cn('badge', variants[variant], className)}>{children}</span>
}
