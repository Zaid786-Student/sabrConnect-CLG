import { Users, Trophy, Briefcase, HeartHandshake, ClipboardCheck, Megaphone } from 'lucide-react'
import { cn } from '../../lib/utils'

const features = [
  {
    icon: Users,
    title: 'Team Formation',
    desc: 'Create a team, showcase your skills, and pull in the right teammates before the deadline hits.',
    span: 'md:col-span-2',
    accent: 'student',
  },
  {
    icon: Trophy,
    title: 'Hackathon Discovery',
    desc: 'Filter by theme, prize pool, and timeline.',
    accent: 'organizer',
  },
  {
    icon: Briefcase,
    title: 'Internship Discovery',
    desc: 'Roles matched to your skills profile.',
    accent: 'student',
  },
  {
    icon: HeartHandshake,
    title: 'Volunteer Coordination',
    desc: 'Assign tasks, track progress, and keep every event fully staffed from setup to teardown.',
    span: 'md:col-span-2',
    accent: 'volunteer',
  },
  {
    icon: ClipboardCheck,
    title: 'Application Tracking',
    desc: 'One place to see every status.',
    accent: 'organizer',
  },
  {
    icon: Megaphone,
    title: 'Event Management',
    desc: 'Publish, manage, and monitor participation in real time.',
    accent: 'volunteer',
  },
]

const iconStyles = {
  student: 'bg-student-soft text-student',
  volunteer: 'bg-volunteer-soft text-volunteer',
  organizer: 'bg-organizer-soft text-organizer',
}

export default function FeatureShowcase() {
  return (
    <section id="features" className="container-page py-24">
      <div className="mb-12 max-w-lg">
        <p className="eyebrow mb-3">Everything, one login</p>
        <h2 className="text-3xl font-semibold md:text-4xl">Replaces the five tabs you're already juggling.</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className={cn('card p-6 transition-colors hover:border-white/15', f.span)}>
            <div className={cn('mb-4 flex h-10 w-10 items-center justify-center rounded-lg', iconStyles[f.accent])}>
              <f.icon size={18} />
            </div>
            <h3 className="font-display text-base font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/45">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
