import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, HeartHandshake, Building2, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/utils'

const roles = [
  {
    id: 'student',
    icon: GraduationCap,
    title: 'Student',
    tagline: 'Find your next build.',
    points: ['Find opportunities', 'Build teams', 'Track applications'],
    accent: 'student',
  },
  {
    id: 'volunteer',
    icon: HeartHandshake,
    title: 'Volunteer',
    tagline: 'Keep events running.',
    points: ['Support events', 'Manage tasks', 'Gain experience'],
    accent: 'volunteer',
  },
  {
    id: 'organizer',
    icon: Building2,
    title: 'Organizer',
    tagline: 'Run the whole program.',
    points: ['Create programs', 'Manage communities', 'Coordinate events'],
    accent: 'organizer',
  },
]

const styles = {
  student: {
    border: 'hover:border-student/40',
    icon: 'bg-student-soft text-student',
    ring: 'ring-student/30',
    dot: 'bg-student',
  },
  volunteer: {
    border: 'hover:border-volunteer/40',
    icon: 'bg-volunteer-soft text-volunteer',
    ring: 'ring-volunteer/30',
    dot: 'bg-volunteer',
  },
  organizer: {
    border: 'hover:border-organizer/40',
    icon: 'bg-organizer-soft text-organizer',
    ring: 'ring-organizer/30',
    dot: 'bg-organizer',
  },
}

export default function RoleShowcase() {
  const [hovered, setHovered] = useState(null)
  const navigate = useNavigate()

  return (
    <section className="container-page py-24">
      <div className="mb-12 max-w-lg">
        <p className="eyebrow mb-3">Three roles, one workspace</p>
        <h2 className="text-3xl font-semibold md:text-4xl">Built around who you are on the platform.</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {roles.map((role) => {
          const s = styles[role.id]
          const Icon = role.icon
          return (
            <button
              key={role.id}
              onMouseEnter={() => setHovered(role.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => navigate('/signup', { state: { role: role.id } })}
              className={cn(
                'card group relative overflow-hidden p-7 text-left transition-all duration-300 hover:-translate-y-1',
                s.border,
              )}
            >
              <div
                className={cn(
                  'absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500',
                  s.dot,
                  hovered === role.id && 'opacity-20',
                )}
              />
              <div className={cn('mb-5 flex h-11 w-11 items-center justify-center rounded-xl', s.icon)}>
                <Icon size={20} />
              </div>
              <h3 className="font-display text-xl font-semibold">{role.title}</h3>
              <p className="mt-1 text-sm text-white/45">{role.tagline}</p>

              <ul className="mt-5 space-y-2.5">
                {role.points.map((point) => (
                  <li key={point} className="flex items-center gap-2.5 text-sm text-white/65">
                    <span className={cn('h-1 w-1 rounded-full', s.dot)} />
                    {point}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex items-center gap-1.5 text-sm font-medium text-white/40 transition-colors group-hover:text-white">
                Join as {role.title} <ArrowUpRight size={14} />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
