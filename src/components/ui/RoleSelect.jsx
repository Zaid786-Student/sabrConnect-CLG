import { GraduationCap, Building2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const roles = [
  { id: 'student', label: 'Student', icon: GraduationCap },
  { id: 'organizer', label: 'Organizer', icon: Building2 },
]

const active = {
  student: 'border-student/50 bg-student-soft text-student',
  organizer: 'border-organizer/50 bg-organizer-soft text-organizer',
}

export default function RoleSelect({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {roles.map((role) => {
        const Icon = role.icon
        const isActive = value === role.id
        return (
          <button
            type="button"
            key={role.id}
            onClick={() => onChange(role.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border border-bg-border bg-white/[0.02] py-3.5 text-xs font-medium text-white/50 transition-colors hover:border-white/20',
              isActive && active[role.id],
            )}
          >
            <Icon size={18} />
            {role.label}
          </button>
        )
      })}
    </div>
  )
}
