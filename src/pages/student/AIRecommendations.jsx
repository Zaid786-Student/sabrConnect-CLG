import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Briefcase, Users2, MapPin, Wallet, CalendarDays, Check } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { SourceBadge, ScorePill } from '../../components/ui/AIBadges'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, initials } from '../../lib/utils'
import { useAIRecommendations } from '../../lib/useAIRecommendations'

const TABS = [
  { id: 'hackathons', label: 'Hackathons', icon: Trophy },
  { id: 'internships', label: 'Internships', icon: Briefcase },
  { id: 'teams', label: 'Teams looking for you', icon: Users2 },
]

export default function AIRecommendations() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { hackathons, internships, teams, getApplication } = useData()
  const [tab, setTab] = useState('hackathons')

  const profile = useMemo(() => ({ skills: user?.skills || [], interests: [] }), [user])

  const hackathonAI = useAIRecommendations('hackathons', profile, hackathons)
  const internshipAI = useAIRecommendations('internships', profile, internships)
  const teamAI = useAIRecommendations('teams', user || {}, teams)

  const hackathonRecs = hackathonAI.results
  const internshipRecs = internshipAI.results
  const teamRecs = teamAI.results

  const active = tab === 'hackathons' ? hackathonAI : tab === 'internships' ? internshipAI : teamAI

  return (
    <DashboardShell
      role="student"
      title="AI Recommendations"
      subtitle="Opportunities ranked by how well they fit your skills and interests."
    >
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
          </button>
        ))}
      </div>

      <div className="mb-6 flex justify-end">
        <SourceBadge source={active.source} loading={active.loading} />
      </div>

      {tab === 'hackathons' && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {hackathonRecs.map(({ hackathon: h, score, reasons }) => {
            const isApplied = Boolean(getApplication(user?.id, h.id))
            return (
              <Card
                key={h.id}
                className="flex cursor-pointer flex-col transition-colors hover:border-white/20"
                onClick={() => navigate(`/dashboard/student/hackathons/${h.id}`)}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge variant="organizer" className="capitalize">{h.status}</Badge>
                  <ScorePill score={score} />
                </div>
                <h3 className="font-display text-base font-semibold leading-snug">{h.title}</h3>
                <p className="mt-1 text-xs text-white/40">{h.organizer_name}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {reasons.map((r) => (
                    <span key={r} className="rounded-full border border-bg-border px-2.5 py-1 text-[11px] text-white/50">
                      {r}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-white/40">
                  <CalendarDays size={13} /> {formatDate(h.start_date)} – {formatDate(h.end_date)}
                </div>
                <Button
                  variant={isApplied ? 'outline' : 'primary'}
                  className={isApplied ? 'mt-5 w-full !border-volunteer/40 !text-volunteer hover:!bg-volunteer-soft' : 'mt-5 w-full'}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/dashboard/student/hackathons/${h.id}`)
                  }}
                >
                  {isApplied ? (<><Check size={15} /> Details</>) : 'Apply Now'}
                </Button>
              </Card>
            )
          })}
          {hackathonRecs.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-sm text-white/30">
              No hackathons published yet — check back soon.
            </p>
          )}
        </div>
      )}

      {tab === 'internships' && (
        <div className="space-y-4">
          {internshipRecs.map(({ internship: i, score, reasons }) => {
            const isApplied = Boolean(getApplication(user?.id, i.id))
            return (
              <Card
                key={i.id}
                className="flex cursor-pointer flex-col gap-4 transition-colors hover:border-white/20 sm:flex-row sm:items-center"
                onClick={() => navigate(`/dashboard/student/internships/${i.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-semibold">{i.title}</h3>
                    <ScorePill score={score} />
                  </div>
                  <p className="mt-1 text-sm text-white/45">{i.company}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {reasons.map((r) => (
                      <span key={r} className="rounded-full border border-bg-border px-2.5 py-1 text-[11px] text-white/50">
                        {r}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1.5"><MapPin size={13} /> {i.location}</span>
                    <span className="flex items-center gap-1.5"><Wallet size={13} /> {i.stipend}</span>
                  </div>
                </div>
                <Button
                  variant={isApplied ? 'outline' : 'primary'}
                  className={isApplied ? 'shrink-0 !border-volunteer/40 !text-volunteer hover:!bg-volunteer-soft' : 'shrink-0'}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/dashboard/student/internships/${i.id}`)
                  }}
                >
                  {isApplied ? (<><Check size={15} /> Details</>) : 'Apply Now'}
                </Button>
              </Card>
            )
          })}
          {internshipRecs.length === 0 && (
            <p className="rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-sm text-white/30">
              No internships published yet — check back soon.
            </p>
          )}
        </div>
      )}

      {tab === 'teams' && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {teamRecs.map(({ team: t, score, reasons }) => (
            <Card
              key={t.id}
              className="flex cursor-pointer flex-col gap-3 transition-colors hover:border-white/20"
              onClick={() => navigate('/dashboard/student/teams')}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-student-soft text-sm">
                    {t.logo || initials(t.team_name)}
                  </span>
                  <p className="text-sm font-semibold">{t.team_name}</p>
                </div>
                <ScorePill score={score} />
              </div>
              <p className="text-xs text-white/45 line-clamp-2">{t.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {reasons.map((r) => (
                  <span key={r} className="rounded-full border border-bg-border px-2.5 py-1 text-[11px] text-white/50">
                    {r}
                  </span>
                ))}
              </div>
              <p className="mt-auto text-xs text-white/35">{t.openSlots} open slot{t.openSlots === 1 ? '' : 's'} · needs {(t.rolesNeeded || []).join(', ') || 'more teammates'}</p>
            </Card>
          ))}
          {teamRecs.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-sm text-white/30">
              No teams are actively recruiting a match for your profile right now.
            </p>
          )}
        </div>
      )}
    </DashboardShell>
  )
}
