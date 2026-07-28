import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Image as ImageIcon, Send, TrendingUp, Clock, Sparkles, Trophy, Briefcase, Link2 } from 'lucide-react'
import DashboardShell from '../layout/DashboardShell'
import { Card } from '../ui/Card'
import Button from '../ui/Button'
import { Textarea } from '../ui/Input'
import PostCard from './PostCard'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { POST_TYPES, fileToDataUrl, splitTags, formatDate, roleTheme } from '../../lib/utils'

const TABS = [
  { id: 'recent', label: 'Recent', icon: Clock },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'opportunities', label: 'Opportunity Updates', icon: Sparkles },
]

const subtitleByRole = {
  student: 'Share wins, recruit teammates, and see what the community is building.',
  volunteer: 'Share hackathons, events, and opportunities worth spreading — and see what everyone else is posting.',
  organizer: 'Share hackathons, events, and opportunities (like SIH) across the whole community, and see what students and volunteers are building.',
}

// Rendered at /dashboard/{student,volunteer,organizer}/feed. Every role sees
// the same community feed and can post — including sharing an external
// opportunity link (a hackathon/event page, a SIH-style listing, etc).
export default function OpportunityFeed({ role = 'student' }) {
  const { user } = useAuth()
  const { posts, addPost, deletePost, toggleLikePost, addPostComment, sharePost, hackathons, internships, announcements } = useData()
  const [tab, setTab] = useState('recent')
  const [form, setForm] = useState({ type: 'project', content: '', tags: '', image: null, link: '' })
  const [posting, setPosting] = useState(false)
  const fileInputRef = useRef(null)
  const theme = roleTheme[role] || roleTheme.student

  const recentPosts = useMemo(() => [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [posts])

  const trendingPosts = useMemo(
    () =>
      [...posts].sort((a, b) => {
        const scoreA = a.likes.length * 2 + a.comments.length * 3 + (a.shares || 0)
        const scoreB = b.likes.length * 2 + b.comments.length * 3 + (b.shares || 0)
        return scoreB - scoreA
      }),
    [posts],
  )

  const opportunityUpdates = useMemo(() => {
    const dashboardBase = `/dashboard/${role}`
    const fromHackathons = hackathons.slice(0, 6).map((h) => ({
      id: `opp-h-${h.id}`, kind: 'hackathon', title: h.title, subtitle: h.organizer_name,
      link: role === 'organizer' ? null : `${dashboardBase}/hackathons/${h.id}`, created_at: h.registration_deadline || h.start_date,
    }))
    const fromInternships = internships.slice(0, 6).map((i) => ({
      id: `opp-i-${i.id}`, kind: 'internship', title: i.title, subtitle: i.organizer_name,
      link: role === 'student' ? `${dashboardBase}/internships/${i.id}` : null, created_at: i.created_at || i.deadline,
    }))
    const fromAnnouncements = announcements.map((a) => ({
      id: `opp-a-${a.id}`, kind: 'announcement', title: a.title, subtitle: a.organizer_name,
      link: null, created_at: a.created_at,
    }))
    return [...fromHackathons, ...fromInternships, ...fromAnnouncements].sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
    )
  }, [hackathons, internships, announcements, role])

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setForm((f) => ({ ...f, image: dataUrl }))
  }

  const submitPost = async (e) => {
    e.preventDefault()
    if (!form.content.trim()) return
    setPosting(true)
    try {
      addPost({ type: form.type, content: form.content, tags: splitTags(form.tags), image: form.image, link: form.link.trim() || null }, user)
      setForm({ type: 'project', content: '', tags: '', image: null, link: '' })
    } finally {
      setPosting(false)
    }
  }

  return (
    <DashboardShell role={role} title="Opportunity Feed" subtitle={subtitleByRole[role] || subtitleByRole.student}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="space-y-3">
          <form onSubmit={submitPost} className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {POST_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t.id }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.type === t.id ? `${theme.border} ${theme.soft} ${theme.text}` : 'border-bg-border text-white/50 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Share a project update, an opportunity, or recruit teammates..."
            />
            {form.image && (
              <img src={form.image} alt="" className="max-h-52 rounded-lg border border-bg-border object-cover" />
            )}
            <div className="flex items-center gap-2 rounded-lg border border-bg-border bg-white/[0.02] px-3 py-2">
              <Link2 size={14} className="shrink-0 text-white/35" />
              <input
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                placeholder="Opportunity link (e.g. Smart India Hackathon registration page)"
                className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/30 focus:outline-none"
              />
            </div>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="Tags (comma separated, e.g. React, AI/ML)"
              className="input-field"
            />
            <div className="flex items-center justify-between">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-white/45 hover:text-white"
              >
                <ImageIcon size={14} /> Add image
              </button>
              <Button type="submit" disabled={posting || !form.content.trim()} className="px-4 py-2 text-xs">
                <Send size={13} /> Post
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-wrap gap-1.5 rounded-xl border border-bg-border bg-white/[0.02] p-1.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                tab === id ? `${theme.soft} ${theme.text}` : 'text-white/55 hover:text-white'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'recent' && <PostList posts={recentPosts} user={user} actions={{ toggleLikePost, addPostComment, sharePost, deletePost }} />}
        {tab === 'trending' && <PostList posts={trendingPosts} user={user} actions={{ toggleLikePost, addPostComment, sharePost, deletePost }} />}
        {tab === 'opportunities' && <OpportunityUpdates items={opportunityUpdates} />}
      </div>
    </DashboardShell>
  )
}

function PostList({ posts, user, actions }) {
  const { toggleLikePost, addPostComment, sharePost, deletePost } = actions
  if (posts.length === 0) {
    return <p className="rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-xs text-white/30">Nothing here yet — be the first to post!</p>
  }
  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          user={user}
          onLike={() => toggleLikePost(p.id, user?.id)}
          onComment={(text) => addPostComment(p.id, text, user)}
          onShare={() => sharePost(p.id, user)}
          onDelete={() => deletePost(p.id, user?.id)}
        />
      ))}
    </div>
  )
}

const kindMeta = {
  hackathon: { icon: Trophy, tone: 'text-organizer bg-organizer-soft border-organizer/30' },
  internship: { icon: Briefcase, tone: 'text-volunteer bg-volunteer-soft border-volunteer/30' },
  announcement: { icon: Sparkles, tone: 'text-student bg-student-soft border-student/30' },
}

function OpportunityUpdates({ items }) {
  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-xs text-white/30">No opportunity updates yet.</p>
  }
  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const { icon: Icon, tone } = kindMeta[item.kind]
        const rowClass = "flex items-center gap-3 rounded-xl border border-bg-border bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04]"
        const inner = (
          <>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tone}`}>
              <Icon size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              <p className="truncate text-xs text-white/40">{item.subtitle} · {formatDate(item.created_at)}</p>
            </div>
          </>
        )
        return item.link ? (
          <Link key={item.id} to={item.link} className={rowClass}>{inner}</Link>
        ) : (
          <div key={item.id} className={rowClass}>{inner}</div>
        )
      })}
    </div>
  )
}
