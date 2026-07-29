import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users2, X, Crown, Target, Link2, Trophy, KeyRound } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import TeamAvatar from '../../components/teams/TeamAvatar'
import TeamRegistrationPanel from '../../components/teams/TeamRegistrationPanel'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'

export default function Teams() {
  const { user } = useAuth()
  const { teams } = useData()

  const [panelMode, setPanelMode] = useState(null) // null | 'create' | 'join'

  return (
    <DashboardShell role="student" title="My Teams" subtitle="Register a new team or join one using a team code.">
      <div className="mb-6 flex flex-wrap justify-end gap-2.5">
        <Button
          variant={panelMode === 'create' ? 'primary' : 'outline'}
          onClick={() => setPanelMode(panelMode === 'create' ? null : 'create')}
        >
          {panelMode === 'create' ? <X size={16} /> : <Plus size={16} />} Create Team
        </Button>
        <Button
          variant={panelMode === 'join' ? 'primary' : 'outline'}
          onClick={() => setPanelMode(panelMode === 'join' ? null : 'join')}
        >
          {panelMode === 'join' ? <X size={16} /> : <KeyRound size={16} />} Join Team
        </Button>
      </div>

      {panelMode && (
        <TeamRegistrationPanel key={panelMode} defaultTab={panelMode} onClose={() => setPanelMode(null)} />
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {teams.map((t) => {
          const isMember = t.members.some((m) => m.id === user?.id)
          const isLeader = t.leader_id === user?.id

          return (
            <Card key={t.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <TeamAvatar logo={t.logo} />
                  <div>
                    <Link to={`/dashboard/student/teams/${t.id}`} className="font-display text-base font-semibold hover:text-student">
                      {t.team_name}
                    </Link>
                    {t.opportunity_title && (
                      <p className="mt-0.5 text-xs text-white/35">
                        For {t.opportunity_type === 'internship' ? 'Internship' : 'Hackathon'}: {t.opportunity_title}
                      </p>
                    )}
                  </div>
                </div>
                <span className="flex items-center gap-1 text-xs text-white/40">
                  <Users2 size={13} /> {t.members.length}
                </span>
              </div>
              <p className="mt-3 text-sm text-white/45">{t.description}</p>

              {t.goal && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-bg-border bg-white/[0.02] px-3 py-2.5 text-xs text-white/50">
                  <Target size={13} className="mt-0.5 shrink-0 text-student" />
                  <span><span className="text-white/30">Goal:</span> {t.goal}</span>
                </div>
              )}
              {t.project_name && <p className="mt-2 text-xs text-white/40">Project: <span className="text-white/70">{t.project_name}</span></p>}
              {t.achievements?.length > 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-organizer">
                  <Trophy size={12} /> {t.achievements.length} achievement{t.achievements.length > 1 ? 's' : ''}
                </p>
              )}
              {t.comm_link && (
                <a href={t.comm_link} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1.5 text-xs text-volunteer hover:underline">
                  <Link2 size={12} /> Team communication link
                </a>
              )}

              {t.interests?.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {t.interests.map((s) => (
                    <span key={s} className="rounded-full border border-volunteer/30 bg-volunteer-soft px-2.5 py-1 text-xs text-volunteer">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {t.skills?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {t.skills.map((s) => (
                    <span key={s} className="rounded-full border border-bg-border px-2.5 py-1 text-xs text-white/45">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {t.rolesNeeded?.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/30">Looking for</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.rolesNeeded.map((r) => (
                      <span key={r} className="rounded-full border border-volunteer/30 bg-volunteer-soft px-2.5 py-1 text-xs text-volunteer">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 -space-x-2 flex items-center">
                {t.members.slice(0, 5).map((m) => (
                  <span
                    key={m.id}
                    title={`${m.name} · ${m.role}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg-card bg-student-soft text-xs font-semibold text-student"
                  >
                    {m.name?.[0]}
                  </span>
                ))}
                {isLeader && t.members.find((m) => m.isLeader) && (
                  <Crown size={13} className="relative left-1 text-organizer" />
                )}
              </div>

              <div className="mt-5 flex gap-2">
                {isMember ? (
                  <Button as={Link} to={`/dashboard/student/teams/${t.id}`} className="w-full">
                    Open Team Workspace
                  </Button>
                ) : (
                  <p className="w-full rounded-lg border border-dashed border-bg-border py-2.5 text-center text-xs text-white/35">
                    {t.openSlots === 0 ? 'Team full' : 'Ask the team leader for their team code to join'}
                  </p>
                )}
              </div>
            </Card>
          )
        })}
        {teams.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-sm text-white/30">
            No teams yet — create one or join with a team code.
          </p>
        )}
      </div>
    </DashboardShell>
  )
}
