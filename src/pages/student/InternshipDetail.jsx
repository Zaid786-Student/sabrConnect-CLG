import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Wallet, Clock, CheckCircle2, Users2, User } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input, { Field, Textarea, Select } from '../../components/ui/Input'
import NoticeList from '../../components/dashboard/NoticeList'
import TeamAvatar from '../../components/teams/TeamAvatar'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, daysUntil } from '../../lib/utils'

export default function InternshipDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { internships, teams, getApplication, applyToOpportunity } = useData()

  const internship = internships.find((i) => i.id === id)
  const application = getApplication(user?.id, id)
  const myTeams = teams.filter((t) => t.members.some((m) => m.id === user?.id))

  const [mode, setMode] = useState('individual') // 'individual' | 'team'
  const [selectedTeamId, setSelectedTeamId] = useState(myTeams[0]?.id || '')
  const [form, setForm] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    college: user?.college || '',
    resumeLink: '',
    portfolioLink: '',
    availability: 'Immediately',
    coverLetter: '',
  })

  if (!internship) {
    return (
      <DashboardShell role="student" title="Internship not found" subtitle="This role may have been removed.">
        <Link to="/dashboard/student/internships" className="text-sm text-white/50 hover:text-white">
          ← Back to Internships
        </Link>
      </DashboardShell>
    )
  }

  const days = daysUntil(internship.deadline)

  const selectedTeam = mode === 'team' ? myTeams.find((t) => t.id === selectedTeamId) : null

  const submit = (e) => {
    e.preventDefault()
    if (mode === 'team' && !selectedTeam) return
    applyToOpportunity({ type: 'internship', opportunity: internship, user, formData: form, team: selectedTeam || undefined })
  }

  return (
    <DashboardShell role="student" title={internship.title} subtitle={internship.company}>
      <button
        onClick={() => navigate('/dashboard/student/internships')}
        className="mb-6 flex items-center gap-1.5 text-sm text-white/45 hover:text-white"
      >
        <ArrowLeft size={15} /> Back to Internships
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {application?.status === 'accepted' && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 size={12} /> Applied
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
              {internship.duration && <Badge variant="neutral">{internship.duration}</Badge>}
            </div>
            <p className="text-sm leading-relaxed text-white/60">{internship.description}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <MapPin size={15} className="text-student" /> {internship.location}
              </div>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Wallet size={15} className="text-student" /> {internship.stipend}
              </div>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Clock size={15} className="text-student" /> {days > 0 ? `${days}d left` : 'Closed'} · Apply by {formatDate(internship.deadline)}
              </div>
            </div>
          </Card>

          {internship.responsibilities && (
            <Card>
              <h2 className="mb-3 font-display text-base font-semibold">Responsibilities</h2>
              <p className="text-sm leading-relaxed text-white/55">{internship.responsibilities}</p>
            </Card>
          )}

          {internship.requirements && (
            <Card>
              <h2 className="mb-3 font-display text-base font-semibold">Requirements</h2>
              <p className="text-sm leading-relaxed text-white/55">{internship.requirements}</p>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 font-display text-base font-semibold">Notices & Updates</h2>
            <NoticeList notices={internship.notices} accent="student" />
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-24">
            {application ? (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-student" />
                  <h2 className="font-display text-base font-semibold">Application submitted</h2>
                </div>
                <p className="text-sm text-white/50">
                  Status: <span className="font-medium capitalize text-white/80">{application.status.replace('_', ' ')}</span>
                </p>
                <p className="mt-1 text-xs text-white/35">Submitted {formatDate(application.created_at)}</p>
                {application.team_id && (
                  <div className="mt-4 space-y-1.5 rounded-xl border border-bg-border bg-white/[0.02] p-4 text-xs text-white/45">
                    <p className="flex items-center gap-1.5 text-white/70">
                      <Users2 size={13} className="text-student" /> Registered as team: {application.team_name}
                    </p>
                    <p><span className="text-white/30">Members ({application.member_count}):</span> {(application.members || []).map((m) => m.name).filter(Boolean).join(', ')}</p>
                  </div>
                )}
                <Button variant="outline" as={Link} to="/dashboard/student/applications" className="mt-5 w-full">
                  View in Applications
                </Button>
                {application.status === 'accepted' && !application.team_id && (
                  <Button as={Link} to={`/dashboard/student/internships/${internship.id}/workspace`} className="mt-2 w-full">
                    Go to Workspace
                  </Button>
                )}
              </div>
            ) : (
              <div>
                <h2 className="mb-4 font-display text-base font-semibold">Apply for this role</h2>

                <div className="mb-4 flex gap-1.5 rounded-xl border border-bg-border bg-white/[0.02] p-1.5">
                  <button
                    type="button"
                    onClick={() => setMode('individual')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${mode === 'individual' ? 'bg-student-soft text-student' : 'text-white/55 hover:text-white'}`}
                  >
                    <User size={13} /> Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('team')}
                    disabled={myTeams.length === 0}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-40 ${mode === 'team' ? 'bg-student-soft text-student' : 'text-white/55 hover:text-white'}`}
                  >
                    <Users2 size={13} /> Apply with team
                  </button>
                </div>

                {mode === 'team' && (
                  myTeams.length === 0 ? (
                    <p className="mb-4 rounded-xl border border-dashed border-bg-border px-4 py-3 text-xs text-white/40">
                      You&apos;re not on a team yet. <Link to="/dashboard/student/teams" className="text-student hover:underline">Create or join one</Link> to apply together.
                    </p>
                  ) : (
                    <div className="mb-4 space-y-2">
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
                  )
                )}

                <form onSubmit={submit} className="space-y-4">
                  <Field label="Full name" htmlFor="fullName">
                    <Input id="fullName" required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
                  </Field>
                  <Field label="Email" htmlFor="email">
                    <Input id="email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </Field>
                  <Field label="Phone" htmlFor="phone">
                    <Input id="phone" required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </Field>
                  <Field label="Resume link" htmlFor="resumeLink" hint="Google Drive, Notion, or similar.">
                    <Input id="resumeLink" required placeholder="https://..." value={form.resumeLink} onChange={(e) => setForm((f) => ({ ...f, resumeLink: e.target.value }))} />
                  </Field>
                  <Field label="Portfolio link (optional)" htmlFor="portfolioLink">
                    <Input id="portfolioLink" placeholder="https://..." value={form.portfolioLink} onChange={(e) => setForm((f) => ({ ...f, portfolioLink: e.target.value }))} />
                  </Field>
                  <Field label="Availability" htmlFor="availability">
                    <Select id="availability" value={form.availability} onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))}>
                      <option>Immediately</option>
                      <option>2 weeks notice</option>
                      <option>After exams</option>
                      <option>Other</option>
                    </Select>
                  </Field>
                  <Field label="Cover letter" htmlFor="coverLetter">
                    <Textarea id="coverLetter" value={form.coverLetter} onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.value }))} />
                  </Field>
                  <Button type="submit" className="w-full" disabled={mode === 'team' && !selectedTeam}>
                    {mode === 'team' && selectedTeam ? `Submit Application for ${selectedTeam.team_name}` : 'Submit Application'}
                  </Button>
                </form>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
