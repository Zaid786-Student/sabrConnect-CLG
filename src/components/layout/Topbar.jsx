import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { initials, roleTheme } from '../../lib/utils'

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export default function Topbar({ title, subtitle, onMenuClick }) {
  const { user, signOut } = useAuth()
  const { notifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications } = useData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)
  const theme = roleTheme[user?.role] || roleTheme.student

  const myNotifications = (notifications || [])
    .filter((n) => n.user_id === user?.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const unreadCount = myNotifications.filter((n) => !n.read).length

  useEffect(() => {
    const onClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleNotificationClick = (n) => {
    markNotificationRead(n.id)
    setNotifOpen(false)
    if (n.link) navigate(n.link)
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-bg-border bg-bg/80 px-6 py-4 backdrop-blur-lg md:px-8">
      <div className="flex items-center gap-3">
        <button className="text-white/60 md:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div>
          <h1 className="font-display text-lg font-semibold md:text-xl">{title}</h1>
          {subtitle && <p className="text-sm text-white/45">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={notifRef}>
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-bg-border text-white/50 hover:text-white"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${theme.bg}`} />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 max-w-[85vw] rounded-xl border border-bg-border bg-bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-bg-border px-4 py-3">
                <p className="text-sm font-semibold">Notifications</p>
                {unreadCount > 0 ? (
                  <button
                    className="text-xs text-white/40 hover:text-white"
                    onClick={() => markAllNotificationsRead(user?.id)}
                  >
                    Mark all read
                  </button>
                ) : myNotifications.length > 0 ? (
                  <button
                    className="text-xs text-white/40 hover:text-red-400"
                    onClick={() => clearAllNotifications(user?.id)}
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {myNotifications.length === 0 && (
                  <p className="px-4 py-8 text-center text-xs text-white/30">You're all caught up.</p>
                )}
                {myNotifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex w-full flex-col items-start gap-0.5 border-b border-bg-border/60 px-4 py-3 text-left last:border-0 hover:bg-white/[0.03] ${!n.read ? 'bg-white/[0.02]' : ''}`}
                  >
                    <span className="flex w-full items-center gap-2">
                      {!n.read && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.bg}`} />}
                      <span className="truncate text-sm font-medium">{n.title}</span>
                    </span>
                    <span className="text-xs text-white/45">{n.message}</span>
                    <span className="text-[11px] text-white/30">{timeAgo(n.created_at)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-lg border border-bg-border py-1.5 pl-1.5 pr-2.5 hover:bg-white/[0.03]"
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold text-black ${theme.bg}`}
            >
              {initials(user?.full_name)}
            </span>
            <span className="hidden text-sm font-medium sm:inline">{user?.full_name?.split(' ')[0]}</span>
            <ChevronDown size={14} className="text-white/40" />
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-52 rounded-xl border border-bg-border bg-bg-card p-1.5 shadow-card">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium">{user?.full_name}</p>
                <p className="truncate text-xs text-white/40">{user?.email}</p>
              </div>
              <div className="my-1 h-px bg-bg-border" />
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/[0.05]"
                onClick={() => {
                  setOpen(false)
                  navigate('/profile')
                }}
              >
                <Settings size={15} /> Profile Settings
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                onClick={handleSignOut}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
