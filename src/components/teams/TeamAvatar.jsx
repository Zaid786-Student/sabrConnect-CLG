import { cn } from '../../lib/utils'

const sizes = {
  sm: 'h-9 w-9 text-base',
  md: 'h-12 w-12 text-xl',
  lg: 'h-16 w-16 text-3xl',
}

export default function TeamAvatar({ logo, size = 'md', className }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl border border-student/30 bg-student-soft',
        sizes[size],
        className,
      )}
    >
      {logo || '🚀'}
    </span>
  )
}
