import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import Button from '../ui/Button'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

export default function Hero() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    registeredUsers: 0,
    teamsCreated: 0,
    opportunitiesLive: 0,
    eventsCompleted: 0,
  })

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true

    const load = async () => {
      const [profiles, teams, hackOpen, intOpen, hackDone] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
        supabase.from('hackathons').select('*', { count: 'exact', head: true }).in('status', ['upcoming', 'open']),
        supabase.from('internships').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('hackathons').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      ])
      if (!active) return
      setStats({
        registeredUsers: profiles.count || 0,
        teamsCreated: teams.count || 0,
        opportunitiesLive: (hackOpen.count || 0) + (intOpen.count || 0),
        eventsCompleted: hackDone.count || 0,
      })
    }
    load()

    return () => {
      active = false
    }
  }, [])

  return (
    <section className="relative overflow-hidden bg-grid">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.14),transparent_60%)]" />
      <div className="container-page relative flex flex-col items-center pb-24 pt-20 text-center md:pt-28">
        <div className="animate-fadeUp inline-flex items-center gap-2 rounded-full border border-bg-border bg-white/[0.03] px-4 py-1.5">
          <span className="flex h-1.5 w-1.5 animate-glowPulse rounded-full bg-student" />
          <span className="eyebrow">Now accepting the IBM Innovation cohort</span>
        </div>

        <h1 className="animate-fadeUp mt-7 max-w-3xl font-display text-4xl font-semibold leading-[1.08] [animation-delay:80ms] md:text-6xl">
          Connect. <span className="text-student">Collaborate.</span>{' '}
          <span className="bg-gradient-to-r from-volunteer to-organizer bg-clip-text text-transparent">Compete.</span>
        </h1>

        <p className="animate-fadeUp mt-6 max-w-xl text-balance text-base text-white/55 [animation-delay:160ms] md:text-lg">
          One ecosystem where students, volunteers, and organizers come together to discover opportunities, build
          teams, and create innovation — without switching between five different tools.
        </p>

        <div className="animate-fadeUp mt-9 flex flex-col gap-3 [animation-delay:240ms] sm:flex-row">
          <Button onClick={() => navigate('/signup')}>
            Get Started <ArrowRight size={16} />
          </Button>
          <Button variant="outline" as="a" href="#opportunities">
            <Compass size={16} /> Explore Opportunities
          </Button>
        </div>

        <div className="animate-fadeUp mt-16 grid w-full max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-bg-border bg-bg-border [animation-delay:320ms] sm:grid-cols-4">
          {[
            ['Registered Users', stats.registeredUsers.toLocaleString()],
            ['Teams Created', stats.teamsCreated.toLocaleString()],
            ['Opportunities Live', stats.opportunitiesLive.toLocaleString()],
            ['Events Completed', stats.eventsCompleted.toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className="bg-bg-card px-4 py-5">
              <p className="font-display text-xl font-semibold md:text-2xl">{value}</p>
              <p className="mt-1 text-xs text-white/40">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}