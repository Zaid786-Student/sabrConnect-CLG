import { useEffect, useState } from 'react'
import { Users, Trophy, Briefcase, Megaphone } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { cn } from '../../lib/utils'

const iconMap = {
  team: { icon: Users, accent: 'student' },
  hackathon: { icon: Trophy, accent: 'organizer' },
  internship: { icon: Briefcase, accent: 'student' },
  announcement: { icon: Megaphone, accent: 'volunteer' },
}

const dotClasses = {
  student: 'bg-student-soft text-student',
  volunteer: 'bg-volunteer-soft text-volunteer',
  organizer: 'bg-organizer-soft text-organizer',
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function ActivityFeed() {
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoaded(true)
      return
    }
    let active = true

    const load = async () => {
      const [hack, intern, teams, announcements] = await Promise.all([
        supabase.from('hackathons').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('internships').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('teams').select('id, name, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('announcements').select('id, title, created_at').order('created_at', { ascending: false }).limit(5),
      ])
      if (!active) return

      const combined = [
        ...(hack.data || []).map((r) => ({ id: `hack-${r.id}`, type: 'hackathon', text: `New hackathon: ${r.title}`, created_at: r.created_at })),
        ...(intern.data || []).map((r) => ({ id: `int-${r.id}`, type: 'internship', text: `New internship: ${r.title}`, created_at: r.created_at })),
        ...(teams.data || []).map((r) => ({ id: `team-${r.id}`, type: 'team', text: `New team formed: ${r.name}`, created_at: r.created_at })),
        ...(announcements.data || []).map((r) => ({ id: `ann-${r.id}`, type: 'announcement', text: r.title, created_at: r.created_at })),
      ]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 6)

      setItems(combined)
      setLoaded(true)
    }
    load()

    return () => {
      active = false
    }
  }, [])

  return (
    <section id="community" className="border-y border-bg-border bg-bg-card/30">
      <div className="container-page py-24">
        <div className="mb-12 max-w-lg">
          <p className="eyebrow mb-3">Community pulse</p>
          <h2 className="text-3xl font-semibold md:text-4xl">Something's always moving.</h2>
        </div>

        <div className="card divide-y divide-bg-border p-0">
          {!loaded && (
            <div className="px-6 py-8 text-center text-sm text-white/40">Loading activity…</div>
          )}
          {loaded && items.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-white/40">
              No activity yet — be the first to create a hackathon, internship, or team.
            </div>
          )}
          {items.map((item) => {
            const meta = iconMap[item.type]
            const Icon = meta.icon
            return (
              <div key={item.id} className="flex items-center gap-4 px-6 py-4">
                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', dotClasses[meta.accent])}>
                  <Icon size={16} />
                </div>
                <p className="flex-1 text-sm text-white/70">{item.text}</p>
                <span className="shrink-0 font-mono text-xs text-white/30">{timeAgo(item.created_at)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}