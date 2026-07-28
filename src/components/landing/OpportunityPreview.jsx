import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, ArrowRight } from 'lucide-react'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { formatDate } from '../../lib/utils'

export default function OpportunityPreview() {
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoaded(true)
      return
    }
    let active = true

    const load = async () => {
      const [hack, intern] = await Promise.all([
        supabase
          .from('hackathons')
          .select('*')
          .in('status', ['upcoming', 'open'])
          .order('created_at', { ascending: false })
          .limit(2),
        supabase
          .from('internships')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1),
      ])
      if (!active) return

      const combined = [
        ...(hack.data || []).map((h) => ({ ...h, kind: 'Hackathon' })),
        ...(intern.data || []).map((i) => ({ ...i, kind: 'Internship', start_date: i.deadline })),
      ]
      setCards(combined)
      setLoaded(true)
    }
    load()

    return () => {
      active = false
    }
  }, [])

  return (
    <section id="opportunities" className="container-page py-24">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-lg">
          <p className="eyebrow mb-3">Live right now</p>
          <h2 className="text-3xl font-semibold md:text-4xl">Hackathons, internships, and innovation challenges.</h2>
        </div>
        <Button variant="outline" onClick={() => navigate('/signup')}>
          View all opportunities <ArrowRight size={16} />
        </Button>
      </div>

      {!loaded && <p className="text-sm text-white/40">Loading opportunities…</p>}

      {loaded && cards.length === 0 && (
        <div className="card p-10 text-center text-sm text-white/40">
          No live opportunities yet. Sign up as an organizer to post the first one.
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((item) => (
          <div key={item.id} className="card flex flex-col p-6 transition-colors hover:border-white/15">
            <div className="mb-4 flex items-center justify-between">
              <Badge variant={item.kind === 'Hackathon' ? 'organizer' : 'student'}>{item.kind}</Badge>
              {item.status && <span className="text-xs capitalize text-white/35">{item.status}</span>}
            </div>
            <h3 className="font-display text-lg font-semibold leading-snug">{item.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-white/45">{item.description}</p>

            <div className="mt-5 flex flex-col gap-2 text-xs text-white/40">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} /> {formatDate(item.start_date)}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={13} /> {item.location || item.organizer_name || item.company}
              </span>
            </div>

            <button
              onClick={() => navigate('/signup')}
              className="mt-6 flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Learn more <ArrowRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}