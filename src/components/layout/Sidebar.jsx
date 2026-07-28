import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  Trophy,
  Briefcase,
  Users,
  ClipboardList,
  CalendarClock,
  Megaphone,
  BarChart3,
  UserCog,
  Zap,
  Compass,
  UserPlus,
  MessageCircle,
  Rss,
  Sparkles,
  Target,
  UserCheck,
} from 'lucide-react'
import { cn } from '../../lib/utils'

const navByRole = {
  student: [
    { to: '/dashboard/student', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/dashboard/student/hackathons', label: 'Hackathons', icon: Trophy },
    { to: '/dashboard/student/internships', label: 'Internships', icon: Briefcase },
    { to: '/dashboard/student/teams', label: 'My Teams', icon: Users },
    { to: '/dashboard/student/applications', label: 'Applications', icon: ClipboardList },
    { to: '/dashboard/student/team-matcher', label: 'AI Team Matcher', icon: Sparkles },
    { to: '/dashboard/student/recommendations', label: 'AI Recommendations', icon: Target },
    { to: '/dashboard/student/connect', label: 'Connect', icon: UserPlus },
    { to: '/dashboard/student/messages', label: 'Messages', icon: MessageCircle },
    { to: '/dashboard/student/feed', label: 'Opportunity Feed', icon: Rss },
  ],
  volunteer: [
    { to: '/dashboard/volunteer', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/dashboard/volunteer/hackathons', label: 'Find Hackathons', icon: Compass },
    { to: '/dashboard/volunteer/events', label: 'Assigned Events', icon: CalendarClock },
    { to: '/dashboard/volunteer/tasks', label: 'Task Board', icon: ClipboardList },
    { to: '/dashboard/volunteer/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/dashboard/volunteer/feed', label: 'Opportunity Feed', icon: Rss },
  ],
  organizer: [
    { to: '/dashboard/organizer', label: 'Overview', icon: LayoutGrid, end: true },
    { to: '/dashboard/organizer/events', label: 'Events', icon: Trophy },
    { to: '/dashboard/organizer/participants', label: 'Participants', icon: Users },
    { to: '/dashboard/organizer/volunteers', label: 'Volunteers', icon: UserCog },
    { to: '/dashboard/organizer/approvals', label: 'Approvals', icon: UserCheck },
    { to: '/dashboard/organizer/announcements', label: 'Announcements', icon: Megaphone },
    { to: '/dashboard/organizer/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/dashboard/organizer/feed', label: 'Opportunity Feed', icon: Rss },
  ],
}

const accentText = {
  student: 'text-student',
  volunteer: 'text-volunteer',
  organizer: 'text-organizer',
}
const accentBg = {
  student: 'bg-student-soft border-student/30 text-student',
  volunteer: 'bg-volunteer-soft border-volunteer/30 text-volunteer',
  organizer: 'bg-organizer-soft border-organizer/30 text-organizer',
}

export default function Sidebar({ role }) {
  const items = navByRole[role] || []

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-bg-border bg-bg-card/40 px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2 font-display text-base font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-student via-volunteer to-organizer">
          <Zap size={14} className="fill-black text-black" />
        </span>
        SabrConnect
      </div>

      <p className="eyebrow px-2 mb-3">{role} Workspace</p>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors border border-transparent',
                isActive ? accentBg[role] : 'text-white/55 hover:bg-white/[0.04] hover:text-white',
              )
            }
          >
            <Icon size={17} className={accentText[role]} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-xl border border-bg-border bg-white/[0.02] p-4">
        <p className="text-xs text-white/40">Need help getting started?</p>
        <p className="mt-1 text-sm text-white/70">Check the Community tab for guides &amp; FAQs.</p>
      </div>
    </aside>
  )
}
