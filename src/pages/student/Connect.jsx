import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Inbox, Check, X, XCircle, MessageCircle, UserCircle } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ProfileCard from '../../components/connect/ProfileCard'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { usePresence } from '../../lib/presence'
import { seedStudentProfiles } from '../../data/mockData'
import { initials } from '../../lib/utils'

const TECH_FILTERS = ['React', 'Node.js', 'AI/ML', 'UI/UX', 'Python', 'Cyber Security', 'Cloud']

const TABS = [
  { id: 'discover', label: 'Discover', icon: Search },
  { id: 'requests', label: 'Requests', icon: Inbox },
  { id: 'network', label: 'My Network', icon: Users },
]

export default function Connect() {
  const { user, getUsersByStatus } = useAuth()
  const {
    isFollowing, followUser, unfollowUser, getFollowers, getFollowing,
    getConnectionStatus, sendConnectRequest, acceptConnectRequest, rejectConnectRequest,
    getConnectionsForUser, connections, getOrCreateConversation,
  } = useData()
  const navigate = useNavigate()
  const online = usePresence(user)

  const [tab, setTab] = useState('discover')
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState([])
  const [allProfiles, setAllProfiles] = useState([])
  const [viewingProfile, setViewingProfile] = useState(null)

  useEffect(() => {
    const registered = getUsersByStatus().filter((u) => u.role === 'student')
    const merged = [...registered, ...seedStudentProfiles]
    const seen = new Set()
    const deduped = []
    merged.forEach((p) => {
      if (seen.has(p.id) || p.id === user?.id) return
      seen.add(p.id)
      deduped.push(p)
    })
    setAllProfiles(deduped)
  }, [user?.id, getUsersByStatus])

  const toggleFilter = (tag) =>
    setActiveFilters((f) => (f.includes(tag) ? f.filter((t) => t !== tag) : [...f, tag]))

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allProfiles.filter((p) => {
      const tags = [...(p.skills || []), ...(p.interests || [])]
      const matchesQuery =
        !q ||
        p.full_name?.toLowerCase().includes(q) ||
        p.college?.toLowerCase().includes(q) ||
        tags.some((t) => t.toLowerCase().includes(q))
      const matchesFilters = activeFilters.length === 0 || activeFilters.every((f) => tags.includes(f))
      return matchesQuery && matchesFilters
    })
  }, [allProfiles, query, activeFilters])

  const goMessage = (profile) => {
    getOrCreateConversation(user, profile)
    navigate('/dashboard/student/messages', { state: { openWith: profile.id } })
  }

  const incomingRequests = connections.filter((c) => c.to_id === user?.id && c.status === 'pending')
  const outgoingRequests = connections.filter((c) => c.from_id === user?.id && c.status === 'pending')
  const followers = getFollowers(user?.id)
  const following = getFollowing(user?.id)
  const myConnections = getConnectionsForUser(user?.id)

  const profileById = (id) => allProfiles.find((p) => p.id === id)

  return (
    <DashboardShell role="student" title="Connect" subtitle="Discover, follow, and connect with students building alongside you.">
      <div className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-bg-border bg-white/[0.02] p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
              tab === id ? 'bg-student-soft text-student' : 'text-white/55 hover:text-white'
            }`}
          >
            <Icon size={13} />
            {label}
            {id === 'requests' && incomingRequests.length > 0 && (
              <span className="ml-0.5 rounded-full bg-student px-1.5 text-[10px] font-semibold text-black">
                {incomingRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'discover' && (
        <div className="space-y-5">
          <Card className="space-y-3.5">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, college, skill, or interest..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {TECH_FILTERS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleFilter(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeFilters.includes(tag)
                      ? 'border-student/30 bg-student-soft text-student'
                      : 'border-bg-border text-white/50 hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
              {activeFilters.length > 0 && (
                <button onClick={() => setActiveFilters([])} className="text-xs text-white/35 hover:text-white">
                  Clear filters
                </button>
              )}
            </div>
          </Card>

          {filteredProfiles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-xs text-white/30">
              No students match your search yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProfiles.map((p) => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  online={!!online[p.id]}
                  following={isFollowing(user?.id, p.id)}
                  connectionStatus={getConnectionStatus(user?.id, p.id)}
                  onFollowToggle={() => (isFollowing(user?.id, p.id) ? unfollowUser(user.id, p.id) : followUser(user, p))}
                  onConnect={() => sendConnectRequest(user, p)}
                  onAcceptConnect={() => {
                    const req = connections.find((c) => c.from_id === p.id && c.to_id === user?.id && c.status === 'pending')
                    if (req) acceptConnectRequest(req.id)
                  }}
                  onMessage={() => goMessage(p)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-semibold">Incoming requests ({incomingRequests.length})</p>
            {incomingRequests.length === 0 ? (
              <p className="rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/30">
                No pending requests right now.
              </p>
            ) : (
              <div className="space-y-2.5">
                {incomingRequests.map((r) => (
                  <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-student-soft text-xs font-semibold text-student">
                        {initials(r.from_name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.from_name}</p>
                        <p className="text-xs text-white/35">wants to connect</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button className="px-3 py-1.5 text-xs" onClick={() => acceptConnectRequest(r.id)}>
                        <Check size={13} /> Accept
                      </Button>
                      <Button variant="outline" className="px-3 py-1.5 text-xs" onClick={() => rejectConnectRequest(r.id)}>
                        <X size={13} /> Reject
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold">Sent requests ({outgoingRequests.length})</p>
            {outgoingRequests.length === 0 ? (
              <p className="rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/30">
                You haven&apos;t sent any connection requests yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {outgoingRequests.map((r) => (
                  <Card key={r.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-xs font-semibold text-white/70">
                        {initials(r.to_name)}
                      </span>
                      <p className="truncate text-sm font-medium">{r.to_name}</p>
                    </div>
                    <Badge variant="neutral" className="shrink-0">Pending</Badge>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'network' && (
        <div className="grid gap-6 md:grid-cols-3">
          <NetworkColumn title={`Connections (${myConnections.length})`}>
            {myConnections.map((c) => {
              const otherId = c.from_id === user?.id ? c.to_id : c.from_id
              const otherName = c.from_id === user?.id ? c.to_name : c.from_name
              const otherProfile = profileById(otherId) || { id: otherId, full_name: otherName }
              return (
                <NetworkRow
                  key={c.id}
                  id={otherId}
                  name={otherName}
                  online={!!online[otherId]}
                  onMessage={() => goMessage(otherProfile)}
                  onViewProfile={() => setViewingProfile(otherProfile)}
                />
              )
            })}
          </NetworkColumn>
          <NetworkColumn title={`Following (${following.length})`}>
            {following.map((f) => {
              const p = profileById(f.following_id) || { id: f.following_id, full_name: f.following_name }
              return (
                <NetworkRow
                  key={f.id}
                  id={f.following_id}
                  name={f.following_name}
                  online={!!online[f.following_id]}
                  onMessage={() => goMessage(p)}
                  onViewProfile={() => setViewingProfile(p)}
                />
              )
            })}
          </NetworkColumn>
          <NetworkColumn title={`Followers (${followers.length})`}>
            {followers.map((f) => {
              const p = profileById(f.follower_id) || { id: f.follower_id, full_name: f.follower_name }
              return (
                <NetworkRow
                  key={f.id}
                  id={f.follower_id}
                  name={f.follower_name}
                  online={!!online[f.follower_id]}
                  onMessage={() => goMessage(p)}
                  onViewProfile={() => setViewingProfile(p)}
                />
              )
            })}
          </NetworkColumn>
        </div>
      )}

      {viewingProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setViewingProfile(null)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <Card className="relative flex flex-col gap-3.5">
              <button
                className="absolute right-3 top-3 text-white/40 hover:text-white"
                onClick={() => setViewingProfile(null)}
                aria-label="Close"
              >
                <XCircle size={18} />
              </button>
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-student-soft text-base font-semibold text-student">
                  {initials(viewingProfile.full_name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{viewingProfile.full_name}</p>
                  <p className="truncate text-xs text-white/40">{viewingProfile.college || 'SabrConnect member'}</p>
                  {viewingProfile.role && (
                    <Badge variant="student" className="mt-1.5 capitalize">{viewingProfile.role}</Badge>
                  )}
                </div>
              </div>
              {viewingProfile.bio && <p className="text-sm text-white/60">{viewingProfile.bio}</p>}
              {[...(viewingProfile.skills || []), ...(viewingProfile.interests || [])].length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {[...(viewingProfile.skills || []), ...(viewingProfile.interests || [])].map((tag) => (
                    <Badge key={tag} variant="student">{tag}</Badge>
                  ))}
                </div>
              )}
              <div className="mt-1 flex gap-2">
                <Button className="flex-1 justify-center px-3 py-2 text-xs" onClick={() => { goMessage(viewingProfile); setViewingProfile(null) }}>
                  Message
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}

function NetworkColumn({ title, children }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : !!children
  return (
    <Card className="p-4">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {!hasChildren ? (
        <p className="py-6 text-center text-xs text-white/30">Nothing here yet.</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </Card>
  )
}

function NetworkRow({ id, name, online, onMessage, onViewProfile }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const rowRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const onClickOutside = (e) => {
      if (rowRef.current && !rowRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  return (
    <div className="relative" ref={rowRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-bg-border bg-white/[0.02] px-3 py-2 text-left hover:border-white/20"
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-student-soft text-[11px] font-semibold text-student">
          {initials(name)}
          {online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-card bg-student" />}
        </span>
        <p className="truncate text-sm text-white/80">{name}</p>
      </button>

      {menuOpen && (
        <div className="absolute left-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-lg border border-bg-border bg-bg-card shadow-card">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.05]"
            onClick={() => {
              setMenuOpen(false)
              onMessage?.()
            }}
          >
            <MessageCircle size={13} /> Message
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.05]"
            onClick={() => {
              setMenuOpen(false)
              onViewProfile?.()
            }}
          >
            <UserCircle size={13} /> Profile
          </button>
        </div>
      )}
    </div>
  )
}
