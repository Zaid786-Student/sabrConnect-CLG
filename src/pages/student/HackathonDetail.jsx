import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Trophy, Users2, CheckCircle2, Clock } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input, { Field, Textarea, Select } from '../../components/ui/Input'
import NoticeList from '../../components/dashboard/NoticeList'
import TeamAvatar from '../../components/teams/TeamAvatar'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, daysUntil, TEAM_CAPACITY } from '../../lib/utils'

// Fixed institution — every registration is locked to this college.
const FIXED_COLLEGE = 'G.C.R.G Group of Institution'

export default function HackathonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { hackathons, teams, getApplication, applyToOpportunity } = useData()

  const hackathon = hackathons.find((h) => h.id === id)
  const application = getApplication(user?.id, id)
  const myTeams = teams.filter((t) => t.members.some((m) => m.id === user?.id))

  // Registration is team-only now — auto-select the student's team.
  const [selectedTeamId, setSelectedTeamId] = useState(myTeams[0]?.id || '')
  const [form, setForm] = useState({
    year: '2nd Year',
    problemStatement1: '',
    problemStatement2: '',
    whyJoin: '',
  })
  const [formError, setFormError] = useState('')

  if (!hackathon) {
    return (
      <DashboardShell role="student" title="Hackathon not found" subtitle="This hackathon may have been removed.">
        <Link to="/dashboard/student/hackathons" className="text-sm text-white/50 hover:text-white">
          ← Back to Hackathons
        </Link>
      </DashboardShell>
    )
  }

  const days = daysUntil(hackathon.registration_deadline || hackathon.start_date)

  const selectedTeam = myTeams.find((t) => t.id === selectedTeamId) || null
  const hasFemaleMember = (team) => (team?.members || []).some((m) => (m.gender || '').toLowerCase() === 'female')

  const submit = (e) => {
    e.preventDefault()
    setFormError('')

    if (!selectedTeam) {
      setFormError('You need a team to register for this hackathon.')
      return
    }
    if (selectedTeam.members.length < TEAM_CAPACITY) {
      setFormError(`Your team needs all ${TEAM_CAPACITY} members (currently ${selectedTeam.members.length}) before registering.`)
      return
    }
    if (!hasFemaleMember(selectedTeam)) {
      setFormError('Your team must include at least one female member to register.')
      return
    }
    if (!form.problemStatement1.trim()) {
      setFormError('Problem statement 1 is required.')
      return
    }

    const formData = {
      fullName: selectedTeam.leader_name,
      email: selectedTeam.leader_email,
      phone: selectedTeam.leader_contact,
      college: FIXED_COLLEGE,
      year: form.year,
      teamName: selectedTeam.team_name,
      problemStatement1: form.problemStatement1,
      problemStatement2: form.problemStatement2,
      whyJoin: form.whyJoin,
    }

    applyToOpportunity({ type: 'hackathon', opportunity: hackathon, user, formData, team: selectedTeam })
  }

  return (
    <DashboardShell role="student" title={hackathon.title} subtitle={hackathon.organizer_name}>
      <button
        onClick={() => navigate('/dashboard/student/hackathons')}
        className="mb-6 flex items-center gap-1.5 text-sm text-white/45 hover:text-white"
      >
        <ArrowLeft size={15} /> Back to Hackathons
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="organizer" className="capitalize">{hackathon.status}</Badge>
              {application?.status === 'accepted' && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 size={12} /> You're registered
                </Badge>
              )}
              {application?.status === 'submitted' && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Clock size={12} /> Waiting for approval
                </Badge>
              )}
              {application?.status === 'in_review' && (
                <Badge variant="warning" className="flex items-center gap-1">
                  <Clock size={12} /> Under review
                </Badge>
              )}
              {application?.status === 'rejected' && (
                <Badge variant="neutral" className="flex items-center gap-1">
                  Not accepted
                </Badge>
              )}
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Users2 size={12} /> {hackathon.participants} participants
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/60">{hackathon.description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <CalendarDays size={15} className="text-student" />
                {formatDate(hackathon.start_date)} – {formatDate(hackathon.end_date)}
              </div>
              {hackathon.location && (
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <MapPin size={15} className="text-student" /> {hackathon.location}
                </div>
              )}
              {hackathon.prize && (
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Trophy size={15} className="text-student" /> {hackathon.prize}
                </div>
              )}
              {hackathon.registration_deadline && (
                <div className="text-sm text-white/50">
                  Registration closes {formatDate(hackathon.registration_deadline)}
                  {days > 0 && <span className="text-white/30"> · {days}d left</span>}
                </div>
              )}
            </div>

            {hackathon.tags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {hackathon.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-bg-border px-2.5 py-1 text-xs text-white/45">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {hackathon.rules && (
            <Card>
              <h2 className="mb-3 font-display text-base font-semibold">Rules & Guidelines</h2>
              <p className="text-sm leading-relaxed text-white/55">{hackathon.rules}</p>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 font-display text-base font-semibold">Notices & Updates</h2>
            <NoticeList notices={hackathon.notices} accent="student" />
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-24">
            {application ? (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-student" />
                  <h2 className="font-display text-base font-semibold">Registration submitted</h2>
                </div>
                <p className="text-sm text-white/50">
                  Status: <span className="font-medium capitalize text-white/80">{application.status.replace('_', ' ')}</span>
                </p>
                <p className="mt-1 text-xs text-white/35">Submitted {formatDate(application.created_at)}</p>
                <div className="mt-5 space-y-2 rounded-xl border border-bg-border bg-white/[0.02] p-4 text-xs text-white/45">
                  {application.team_id ? (
                    <>
                      <p className="flex items-center gap-1.5 text-white/70">
                        <Users2 size={13} className="text-student" /> Registered as team: {application.team_name}
                      </p>
                      <p><span className="text-white/30">Members ({application.member_count}):</span> {(application.members || []).map((m) => m.name).filter(Boolean).join(', ')}</p>
                      <p><span className="text-white/30">Problem statement 1:</span> {application.formData?.problemStatement1 || '—'}</p>
                      <p><span className="text-white/30">Problem statement 2:</span> {application.formData?.problemStatement2 || '—'}</p>
                    </>
                  ) : (
                    <p><span className="text-white/30">Team:</span> {application.formData?.teamName || '—'}</p>
                  )}
                </div>
                <Button variant="outline" as={Link} to="/dashboard/student/applications" className="mt-5 w-full">
                  View in Applications
                </Button>
                {application.status === 'accepted' && !application.team_id && (
                  <Button as={Link} to={`/dashboard/student/hackathons/${hackathon.id}/workspace`} className="mt-2 w-full">
                    Go to Workspace
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <h2 className="mb-4 font-display text-base font-semibold">Register for this hackathon</h2>
                <p className="mb-4 flex items-center gap-1.5 text-xs text-white/40">
                  <Users2 size={13} className="text-student" /> Registration is team-based only — {TEAM_CAPACITY} members per team, including at least one female member.
                </p>

                {myTeams.length === 0 ? (
                  <p className="mb-4 rounded-xl border border-dashed border-bg-border px-4 py-3 text-xs text-white/40">
                    You&apos;re not on a team yet. <Link to="/dashboard/student/teams" className="text-student hover:underline">Create or join one</Link> to register.
                  </p>
                ) : myTeams.length === 1 ? (
                  <div className="mb-4 flex items-center gap-3 rounded-xl border border-student/50 bg-student-soft px-3.5 py-2.5 text-sm">
                    <TeamAvatar logo={selectedTeam?.logo} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-white/85">{selectedTeam?.team_name}</span>
                      <span className="block text-xs text-white/40">
                        {selectedTeam?.members.length} member{selectedTeam?.members.length === 1 ? '' : 's'} · auto-selected
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs text-white/40">You&apos;re on multiple teams — pick which one is registering.</p>
                    {myTeams.map((t) => (
                      <label
                        key={t.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${selectedTeamId === t.id ? 'border-student/50 bg-student-soft' : 'border-bg-border bg-white/[0.02] hover:border-white/20'}`}
                      >
                        <input
                          type="radio"
                          name="team"
                          checked={selectedTeamId === t.id}
                          onChange={() => setSelectedTeamId(t.id)}
                          className="accent-student"
                        />
                        <TeamAvatar logo={t.logo} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-white/85">{t.team_name}</span>
                          <span className="block text-xs text-white/40">{t.members.length} member{t.members.length === 1 ? '' : 's'}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {myTeams.length > 0 && (
                  <form onSubmit={submit} className="space-y-4">
                    <Field label="Team name" htmlFor="teamName">
                      <Input id="teamName" value={selectedTeam?.team_name || ''} disabled readOnly />
                    </Field>
                    <Field label="Team leader's name" htmlFor="fullName">
                      <Input id="fullName" value={selectedTeam?.leader_name || ''} disabled readOnly />
                    </Field>
                    <Field label="Team leader's email" htmlFor="email">
                      <Input id="email" type="email" value={selectedTeam?.leader_email || ''} disabled readOnly />
                    </Field>
                    <Field label="Team leader's phone" htmlFor="phone">
                      <Input id="phone" value={selectedTeam?.leader_contact || ''} disabled readOnly />
                    </Field>
                    <Field label="College" htmlFor="college">
                      <Input id="college" value={FIXED_COLLEGE} disabled readOnly />
                    </Field>
                    <Field label="Year" htmlFor="year">
                      <Select id="year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}>
                        <option>1st Year</option>
                        <option>2nd Year</option>
                        <option>3rd Year</option>
                        <option>4th Year</option>
                        <option>Other</option>
                      </Select>
                    </Field>
                    <Field label="Problem statement 1" htmlFor="problemStatement1" hint="Required.">
                      <Textarea
                        id="problemStatement1"
                        required
                        value={form.problemStatement1}
                        onChange={(e) => setForm((f) => ({ ...f, problemStatement1: e.target.value }))}
                      />
                    </Field>
                    <Field label="Problem statement 2 (optional)" htmlFor="problemStatement2">
                      <Textarea
                        id="problemStatement2"
                        value={form.problemStatement2}
                        onChange={(e) => setForm((f) => ({ ...f, problemStatement2: e.target.value }))}
                      />
                    </Field>
                    <Field label="Why do you want to join?" htmlFor="whyJoin">
                      <Textarea id="whyJoin" value={form.whyJoin} onChange={(e) => setForm((f) => ({ ...f, whyJoin: e.target.value }))} />
                    </Field>

                    {formError && <p className="text-xs text-red-400">{formError}</p>}

                    <Button type="submit" className="w-full" disabled={!selectedTeam}>
                      {selectedTeam ? `Submit Registration for ${selectedTeam.team_name}` : 'Submit Registration'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
