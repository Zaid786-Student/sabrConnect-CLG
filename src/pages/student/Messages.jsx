import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, MessageCircle, ArrowLeft, Plus, X, Search } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { usePresence, useTyping } from '../../lib/presence'
import { seedStudentProfiles } from '../../data/mockData'
import { initials } from '../../lib/utils'

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export default function Messages() {
  const { user, getUsersByStatus } = useAuth()
  const { getConversationsForUser, sendDirectMessage, markConversationRead, getOrCreateConversation, getConnectionsForUser } = useData()
  const location = useLocation()
  const online = usePresence(user)

  const [allProfiles, setAllProfiles] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [text, setText] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerQuery, setComposerQuery] = useState('')
  const scrollRef = useRef(null)

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
  }, [getUsersByStatus, user?.id])

  const conversations = getConversationsForUser(user?.id)

  // Support arriving here from a profile's "Message" button.
  useEffect(() => {
    const targetId = location.state?.openWith
    if (!targetId) return
    const target = allProfiles.find((p) => p.id === targetId)
    if (!target) return
    let cancelled = false
    Promise.resolve(getOrCreateConversation(user, target)).then((convo) => {
      if (!cancelled && convo) setActiveId(convo.id)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.openWith, allProfiles.length])

  useEffect(() => {
    if (!activeId && conversations.length > 0) setActiveId(conversations[0].id)
  }, [activeId, conversations.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = conversations.find((c) => c.id === activeId)
  const otherId = active?.participantIds.find((id) => id !== user?.id)
  const otherProfile = allProfiles.find((p) => p.id === otherId) || active?.participants.find((p) => p.id === otherId)

  const { typingNames, notifyTyping, notifyStopTyping } = useTyping(activeId, user)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [active?.messages.length])

  useEffect(() => {
    if (activeId) markConversationRead(activeId, user?.id)
  }, [activeId, active?.messages.length, user?.id, markConversationRead])

  const handleTextChange = (e) => {
    setText(e.target.value)
    if (e.target.value.trim()) notifyTyping()
    else notifyStopTyping()
  }

  const [sendError, setSendError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim() || !active) return
    setSendError('')
    const result = await sendDirectMessage(active.id, text, user)
    notifyStopTyping()
    if (!result) {
      setSendError('Message could not be sent. Please try again.')
      return
    }
    setText('')
  }

  const unreadFor = (conversation) =>
    conversation.messages.filter((m) => m.sender_id !== user?.id && !m.read).length

  const startConversation = async (profile) => {
    const convo = await getOrCreateConversation(user, profile)
    if (convo) setActiveId(convo.id)
    setComposerOpen(false)
    setComposerQuery('')
  }

  const myConnections = getConnectionsForUser(user?.id)
  const connectionProfiles = useMemo(() => {
    return myConnections
      .map((c) => {
        const otherId = c.from_id === user?.id ? c.to_id : c.from_id
        const otherName = c.from_id === user?.id ? c.to_name : c.from_name
        return allProfiles.find((p) => p.id === otherId) || { id: otherId, full_name: otherName }
      })
      .filter(Boolean)
  }, [myConnections, allProfiles, user?.id])

  const composerResults = useMemo(() => {
    const q = composerQuery.trim().toLowerCase()
    if (!q) return connectionProfiles
    return connectionProfiles.filter((p) => p.full_name?.toLowerCase().includes(q))
  }, [connectionProfiles, composerQuery])

  return (
    <DashboardShell role="student" title="Messages" subtitle="Direct conversations with people in your network.">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className={`flex max-h-[640px] flex-col p-0 ${active ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between border-b border-bg-border px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold">Inbox</p>
              <p className="text-xs text-white/35">{conversations.length} conversation{conversations.length === 1 ? '' : 's'}</p>
            </div>
            <button
              onClick={() => setComposerOpen(true)}
              className="flex items-center gap-1 rounded-lg border border-student/30 bg-student-soft px-2.5 py-1.5 text-xs font-medium text-student hover:brightness-110"
            >
              <Plus size={13} /> New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <p className="px-4 py-10 text-center text-xs text-white/30">
                No conversations yet — tap "New" above or message someone from the Connect tab.
              </p>
            )}
            {conversations.map((c) => {
              const oId = c.participantIds.find((id) => id !== user?.id)
              const other = allProfiles.find((p) => p.id === oId) || c.participants.find((p) => p.id === oId)
              const last = c.messages[c.messages.length - 1]
              const unread = unreadFor(c)
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={`flex w-full items-center gap-3 border-b border-bg-border/60 px-4 py-3 text-left last:border-0 hover:bg-white/[0.03] ${
                    activeId === c.id ? 'bg-white/[0.04]' : ''
                  }`}
                >
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-student-soft text-xs font-semibold text-student">
                    {initials(other?.full_name)}
                    {online[oId] && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-card bg-student" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{other?.full_name || 'Student'}</p>
                    <p className="truncate text-xs text-white/40">{last ? last.text : 'Say hello 👋'}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {last && <span className="text-[10px] text-white/30">{timeAgo(last.created_at)}</span>}
                    {unread > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-student px-1 text-[10px] font-semibold text-black">
                        {unread}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        <Card className={`h-[640px] flex-col p-0 ${!active ? 'hidden lg:flex' : 'flex'}`}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-white/30">
              <MessageCircle size={28} />
              <p className="text-xs">Select a conversation to start chatting.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-bg-border px-5 py-3.5">
                <button
                  onClick={() => setActiveId(null)}
                  className="text-white/50 hover:text-white lg:hidden"
                  aria-label="Back to inbox"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-student-soft text-xs font-semibold text-student">
                  {initials(otherProfile?.full_name)}
                  {online[otherId] && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-card bg-student" />}
                </span>
                <div>
                  <p className="text-sm font-semibold">{otherProfile?.full_name || 'Student'}</p>
                  <p className="text-xs text-white/35">{online[otherId] ? 'Online' : 'Offline'}</p>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                {active.messages.length === 0 && (
                  <p className="pt-10 text-center text-xs text-white/30">No messages yet — say hello 👋</p>
                )}
                {active.messages.map((m) => {
                  const mine = m.sender_id === user?.id
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-student text-black' : 'border border-bg-border bg-white/[0.03] text-white/80'}`}>
                        <p>{m.text}</p>
                        <p className={`mt-1 text-[10px] ${mine ? 'text-black/50' : 'text-white/30'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="border-t border-bg-border">
                {typingNames.length > 0 && (
                  <p className="px-5 pt-2 text-[11px] italic text-white/40">{otherProfile?.full_name || 'They'} {typingNames.length === 1 ? 'is' : 'are'} typing…</p>
                )}
                {sendError && <p className="px-5 pt-2 text-[11px] text-red-400">{sendError}</p>}
                <form onSubmit={submit} className="flex items-center gap-2 p-3">
                  <Input value={text} onChange={handleTextChange} onBlur={notifyStopTyping} placeholder="Write a message..." className="flex-1" />
                  <Button type="submit" className="px-3.5"><Send size={15} /></Button>
                </form>
              </div>
            </>
          )}
        </Card>
      </div>

      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setComposerOpen(false)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <Card className="flex max-h-[70vh] flex-col gap-3 p-0">
              <div className="flex items-center justify-between border-b border-bg-border px-4 py-3.5">
                <p className="text-sm font-semibold">New message</p>
                <button onClick={() => setComposerOpen(false)} className="text-white/40 hover:text-white" aria-label="Close">
                  <X size={16} />
                </button>
              </div>
              <div className="px-4">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <Input
                    autoFocus
                    value={composerQuery}
                    onChange={(e) => setComposerQuery(e.target.value)}
                    placeholder="Search by name..."
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-3">
                {composerResults.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-white/30">
                    No connections yet — connect with someone in the Connect tab first.
                  </p>
                ) : (
                  composerResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => startConversation(p)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-white/[0.05]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-student-soft text-[11px] font-semibold text-student">
                        {initials(p.full_name)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/85">{p.full_name}</p>
                        <p className="truncate text-xs text-white/35">{p.college || 'SabrConnect member'}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
