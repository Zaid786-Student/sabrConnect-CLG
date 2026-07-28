import { Link } from 'react-router-dom'
import { Zap, ShieldCheck, Users2, Sparkles } from 'lucide-react'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <Link to="/" className="mb-10 flex items-center gap-2 font-display text-lg font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-student via-volunteer to-organizer">
            <Zap size={15} className="fill-black text-black" />
          </span>
          SabrConnect
        </Link>

        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-white/45">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-bg-border bg-bg-card lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-student/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-volunteer/10 blur-3xl" />

        <div className="relative">
          <p className="eyebrow mb-4">Connect. Collaborate. Compete.</p>
          <h2 className="max-w-sm font-display text-3xl font-semibold leading-tight">
            One login. Every hackathon, internship, and team you're part of.
          </h2>

          <div className="mt-10 space-y-5">
            {[
              [Users2, 'Match into teams built around complementary skills.'],
              [Sparkles, 'Discover curated hackathons and internships weekly.'],
              [ShieldCheck, 'Role-based dashboards keep everyone in their lane.'],
            ].map(([Icon, text], i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  <Icon size={15} className="text-white/60" />
                </div>
                <p className="text-sm text-white/50">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
