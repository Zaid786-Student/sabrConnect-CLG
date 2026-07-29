import { useState } from 'react'
import { X, Zap } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function DashboardShell({ role, title, subtitle, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar role={role} />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-72 border-r border-bg-border bg-bg p-4">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-base font-semibold">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-student via-volunteer to-organizer">
                  <Zap size={14} className="fill-black text-black" />
                </span>
                SabrConnect
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-white/60">
                <X size={20} />
              </button>
            </div>
            <MobileNav role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-6 py-8 md:px-8">{children}</main>
      </div>
    </div>
  )
}

function MobileNav({ role, onNavigate }) {
  const items = {
    student: [
      ['/dashboard/student', 'Overview'],
      ['/dashboard/student/hackathons', 'Hackathons'],
      ['/dashboard/student/internships', 'Internships'],
      ['/dashboard/student/applications', 'Applications'],
      ['/dashboard/student/team-matcher', 'AI Team Matcher'],
      ['/dashboard/student/recommendations', 'AI Recommendations'],
      ['/dashboard/student/connect', 'Connect'],
      ['/dashboard/student/messages', 'Messages'],
      ['/dashboard/student/feed', 'Opportunity Feed'],
    ],
    volunteer: [
      ['/dashboard/volunteer', 'Overview'],
      ['/dashboard/volunteer/hackathons', 'Find Hackathons'],
      ['/dashboard/volunteer/events', 'Assigned Events'],
      ['/dashboard/volunteer/tasks', 'Task Board'],
      ['/dashboard/volunteer/announcements', 'Announcements'],
      ['/dashboard/volunteer/feed', 'Opportunity Feed'],
    ],
    organizer: [
      ['/dashboard/organizer', 'Overview'],
      ['/dashboard/organizer/events', 'Events'],
      ['/dashboard/organizer/participants', 'Participants'],
      ['/dashboard/organizer/volunteers', 'Volunteers'],
      ['/dashboard/organizer/approvals', 'Approvals'],
      ['/dashboard/organizer/announcements', 'Announcements'],
      ['/dashboard/organizer/analytics', 'Analytics'],
      ['/dashboard/organizer/feed', 'Opportunity Feed'],
    ],
  }[role]

  return (
    <nav className="flex flex-col gap-1">
      {items.map(([to, label]) => (
        <NavLink
          key={to}
          to={to}
          end={to.split('/').length === 3}
          onClick={onNavigate}
          className={({ isActive }) =>
            `rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-white/[0.06] text-white' : 'text-white/60'}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
