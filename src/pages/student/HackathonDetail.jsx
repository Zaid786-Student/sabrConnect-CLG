import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CalendarDays, MapPin, Trophy, Users2, CheckCircle2, Clock, Link2, ArrowUpRight,
  Plus, KeyRound, X, UserRound, UserRoundX, Crown, Copy, Check, Mail, HeartHandshake, Lock,
} from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input, { Field, Textarea, Select } from '../../components/ui/Input'
import NoticeList from '../../components/dashboard/NoticeList'
import TeamAvatar from '../../components/teams/TeamAvatar'
import TeamRegistrationPanel from '../../components/teams/TeamRegistrationPanel'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, daysUntil, uid, TEAM_CAPACITY, GENDER_OPTIONS } from '../../lib/utils'

// Fixed institution — every registration is locked to this college.
const FIXED_COLLEGE = 'G.C.R.G Group of Institution'

export default function HackathonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    hackathons, teams, getApplication, applyToOpportunity, requestToJoinTeam, cancelJoinRequest,
    volunteerSignUp, getVolunteerSignup, finalizeApplication,
  } = useData()

  const hackathon = hackathons.find((h) => h.id === id)
  const application = getApplication(user?.id, id)
  const mySignup = getVolunteerSignup(user?.id, id)

  // Which of the two registration paths this page is currently showing —
  // both live on this same hackathon page, just swapping the sidebar panel.
  const [viewAs, setViewAs] = useState('student')

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

  // Organizer-configured team setup for this hackathon, published from the
  // "Publish New" form — falls back to the app-wide defaults when the
  // organizer left these blank, so older/unset hackathons behave exactly
  // as before.
  const requiredTeamSize = hackathon.team_size || TEAM_CAPACITY
  const requiredFemaleMembers = hackathon.min_female_members ?? 1
  const femaleMemberCount = (team) => (team?.members || []).filter((m) => (m.gender || '').toLowerCase() === 'female').length

  // ---------- Teams section (scoped to this hackathon only) — team
  // formation (Create/Join Team, join-request approval) is untouched here,
  // this just renders it filtered to this specific hackathon. ----------
  const hackathonTeams = teams.filter((t) => t.opportunity_id === hackathon.id)
  const [teamPanel, setTeamPanel] = useState(null) // null | 'create' | 'join'
  const [joinBusyId, setJoinBusyId] = useState('')
  const [joinFeedback, setJoinFeedback] = useState({}) // teamId -> message

  const myTeamForThisHackathon = hackathonTeams.find((t) => t.members.some((m) => m.id === user?.id))

  const REQUEST_ERROR_MESSAGES = {
    ALREADY_MEMBER: "You're already on this team.",
    ALREADY_REQUESTED: 'You already have a pending request for this team.',
    TEAM_FULL: 'This team just filled its open slots.',
    ALREADY_REGISTERED: "You're already registered with another team for this hackathon.",
    UNKNOWN: 'Something went wrong — please try again.',
  }

  const sendJoinRequest = async (team) => {
    setJoinBusyId(team.id)
    const result = await requestToJoinTeam(team.id, user, {})
    setJoinBusyId('')
    setJoinFeedback((f) => ({
      ...f,
      [team.id]: result?.success ? 'Request sent — waiting on the team leader.' : REQUEST_ERROR_MESSAGES[result?.error] || REQUEST_ERROR_MESSAGES.UNKNOWN,
    }))
  }

  const withdrawJoinRequest = async (team, requestId) => {
    setJoinBusyId(team.id)
    await cancelJoinRequest(team.id, requestId)
    setJoinBusyId('')
    setJoinFeedback((f) => ({ ...f, [team.id]: '' }))
  }

  // ---------- Registration (leader fills everyone upfront, teammates
  // confirm their own spot later via an invite link) ----------
  const [leaderForm, setLeaderForm] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    year: '2nd Year',
    gender: '',
  })
  const [memberRows, setMemberRows] = useState([{ name: '', email: '', phone: '' }])
  const [statements, setStatements] = useState({ problemStatement1: '', problemStatement2: '', whyJoin: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copiedToken, setCopiedToken] = useState('')

  const maxMemberRows = Math.max(0, requiredTeamSize - 1)

  const addMemberRow = () => {
    if (memberRows.length >= maxMemberRows) return
    setMemberRows((rows) => [...rows, { name: '', email: '', phone: '' }])
  }
  const removeMemberRow = (index) => setMemberRows((rows) => rows.filter((_, i) => i !== index))
  const updateMemberRow = (index, field, value) =>
    setMemberRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!leaderForm.name.trim() || !leaderForm.email.trim() || !leaderForm.phone.trim() || !leaderForm.gender) {
      setFormError('Please fill in your name, email, phone number, and gender.')
      return
    }

    const partiallyFilled = memberRows.some(
      (m) => (m.name.trim() || m.email.trim() || m.phone.trim()) && (!m.name.trim() || !m.email.trim() || !m.phone.trim()),
    )
    if (partiallyFilled) {
      setFormError('Each teammate needs a name, email, and phone number — remove any half-filled row instead.')
      return
    }
    const filledMembers = memberRows.filter((m) => m.name.trim() && m.email.trim() && m.phone.trim())
    if (filledMembers.length < maxMemberRows) {
      setFormError(
        `Add all ${maxMemberRows} teammate${maxMemberRows === 1 ? '' : 's'} (currently ${filledMembers.length}) — just their name and phone for now, they'll fill the rest themselves via their invite link.`,
      )
      return
    }
    if (!statements.problemStatement1.trim()) {
      setFormError('Problem statement 1 is required.')
      return
    }

    setSubmitting(true)
    const pendingMembers = filledMembers.map((m) => ({
      token: uid('inv'),
      name: m.name.trim(),
      email: m.email.trim(),
      phone: m.phone.trim(),
      confirmed: false,
    }))

    const formData = {
      fullName: leaderForm.name,
      email: leaderForm.email,
      phone: leaderForm.phone,
      gender: leaderForm.gender,
      college: FIXED_COLLEGE,
      year: leaderForm.year,
      problemStatement1: statements.problemStatement1,
      problemStatement2: statements.problemStatement2,
      whyJoin: statements.whyJoin,
      pendingMembers,
    }

    await applyToOpportunity({ type: 'hackathon', opportunity: hackathon, user, formData, notifyApplicant: true })
    setSubmitting(false)
  }

  const inviteLink = (token) => `${window.location.origin}/dashboard/student/confirm/${application?.id}/${token}`
  const copyLink = (token) => {
    navigator.clipboard?.writeText(inviteLink(token))
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(''), 1500)
  }
  // No email-sending backend is wired up yet (see NotificationsContext's
  // sendMail — it only logs to mail_log, it doesn't reach a real inbox), so
  // this opens the leader's own mail client with the invite pre-filled
  // rather than silently pretending an email went out.
  const mailtoInvite = (member) => {
    const subject = encodeURIComponent(`Join my team for ${hackathon.title}`)
    const body = encodeURIComponent(
      `Hi ${member.name},\n\nYou've been added to our team for ${hackathon.title}. Confirm your spot here:\n${inviteLink(member.token)}\n\nSee you there!`,
    )
    return `mailto:${member.email}?subject=${subject}&body=${body}`
  }

  // ---------- Final submission gating ----------
  // The leader's "Submit Registration" above is just step one — teammates
  // still need to confirm via their invite link before the roster is
  // actually complete. Only once the team has exactly the hackathon's
  // required size, with enough confirmed female members, does Final
  // Submission unlock.
  const pendingMembers = application?.formData?.pendingMembers || []
  const confirmedMemberCount = pendingMembers.filter((m) => m.confirmed).length
  const totalConfirmedCount = application ? 1 + confirmedMemberCount : 0 // +1 for the leader
  const femaleCount =
    (application && (application.formData?.gender || '').toLowerCase() === 'female' ? 1 : 0) +
    pendingMembers.filter((m) => m.confirmed && (m.gender || '').toLowerCase() === 'female').length
  const teamSizeMet = totalConfirmedCount >= requiredTeamSize
  const femaleCountMet = femaleCount >= requiredFemaleMembers
  const rosterComplete = teamSizeMet && femaleCountMet
  const isFinalized = Boolean(application?.formData?.finalized)
  const [finalizing, setFinalizing] = useState(false)

  const submitFinal = async () => {
    setFinalizing(true)
    await finalizeApplication(application.id)
    setFinalizing(false)
  }

  return (
    <DashboardShell role="student" title={hackathon.title} subtitle={hackathon.organizer_name}>
      <button
        onClick={() => navigate('/dashboard/student/hackathons')}
        className="mb-6 flex items-center gap-1.5 text-sm text-white/45 hover:text-white"
      >
        <ArrowLeft size={15} /> Back to Hackathons
      </button>

      <div className="mb-6 flex gap-2 rounded-xl border border-bg-border bg-white/[0.02] p-1.5 sm:w-fit">
        <button
          type="button"
          onClick={() => setViewAs('student')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
            viewAs === 'student' ? 'bg-student-soft text-student' : 'text-white/50 hover:text-white'
          }`}
        >
          <Users2 size={14} /> Student — register a team
        </button>
        <button
          type="button"
          onClick={() => setViewAs('volunteer')}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
            viewAs === 'volunteer' ? 'bg-volunteer-soft text-volunteer' : 'text-white/50 hover:text-white'
          }`}
        >
          <HeartHandshake size={14} /> Volunteer for this event
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {hackathon.thumbnail_url && (
            <img src={hackathon.thumbnail_url} alt="" className="h-56 w-full rounded-2xl border border-bg-border object-cover" />
          )}
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
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Users2 size={15} className="text-student" /> {requiredTeamSize} members per team
                {requiredFemaleMembers > 0 && ` · min ${requiredFemaleMembers} female`}
              </div>
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

          {viewAs === 'student' && (
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold">Teams for this Hackathon</h2>
                  <p className="mt-0.5 text-xs text-white/40">Teams registered for {hackathon.title} — request to join one, or start your own.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={teamPanel === 'create' ? 'primary' : 'outline'}
                    className="text-xs"
                    onClick={() => setTeamPanel(teamPanel === 'create' ? null : 'create')}
                  >
                    {teamPanel === 'create' ? <X size={14} /> : <Plus size={14} />} Create Team
                  </Button>
                  <Button
                    variant={teamPanel === 'join' ? 'primary' : 'outline'}
                    className="text-xs"
                    onClick={() => setTeamPanel(teamPanel === 'join' ? null : 'join')}
                  >
                    {teamPanel === 'join' ? <X size={14} /> : <KeyRound size={14} />} Join Team
                  </Button>
                </div>
              </div>

              {teamPanel && (
                <TeamRegistrationPanel
                  key={teamPanel}
                  defaultTab={teamPanel}
                  opportunity={{ id: hackathon.id, title: hackathon.title, type: 'hackathon' }}
                  onClose={() => setTeamPanel(null)}
                />
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {hackathonTeams.map((t) => {
                  const isMemberOfThisTeam = t.members.some((m) => m.id === user?.id)
                  const myPendingRequest = (t.joinRequests || []).find((r) => r.user_id === user?.id && r.status === 'pending')
                  const candidatesRemaining = Math.max(0, requiredTeamSize - t.members.length)
                  const femaleRemaining = Math.max(0, requiredFemaleMembers - femaleMemberCount(t))
                  const isFull = candidatesRemaining === 0
                  const feedback = joinFeedback[t.id]

                  return (
                    <div key={t.id} className="flex flex-col rounded-xl border border-bg-border bg-white/[0.02] p-4">
                      <div className="flex items-start gap-3">
                        <TeamAvatar logo={t.logo} size="sm" />
                        <div className="min-w-0 flex-1">
                          <Link to={`/dashboard/student/teams/${t.id}`} className="block truncate font-display text-sm font-semibold hover:text-student">
                            {t.team_name}
                          </Link>
                          <p className="text-xs text-white/35">Led by {t.leader_name || 'Team leader'}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="flex items-center gap-1 rounded-full border border-bg-border px-2.5 py-1 text-xs text-white/50">
                          <UserRound size={12} className="text-student" /> {candidatesRemaining} slot{candidatesRemaining === 1 ? '' : 's'} left
                        </span>
                        {requiredFemaleMembers > 0 && (
                          <span className="flex items-center gap-1 rounded-full border border-bg-border px-2.5 py-1 text-xs text-white/50">
                            <UserRoundX size={12} className="text-organizer" /> {femaleRemaining} female slot{femaleRemaining === 1 ? '' : 's'} needed
                          </span>
                        )}
                      </div>

                      <div className="mt-3 -space-x-2 flex items-center">
                        {t.members.slice(0, 6).map((m) => (
                          <span
                            key={m.id}
                            title={m.name}
                            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-card bg-student-soft text-[11px] font-semibold text-student"
                          >
                            {m.name?.[0]}
                          </span>
                        ))}
                        {t.members.find((m) => m.isLeader) && <Crown size={12} className="relative left-1 text-organizer" />}
                      </div>

                      {feedback && <p className="mt-3 text-xs text-white/45">{feedback}</p>}

                      <div className="mt-4">
                        {isMemberOfThisTeam ? (
                          <Button as={Link} to={`/dashboard/student/teams/${t.id}`} className="w-full text-xs">
                            Your Team — Open Workspace
                          </Button>
                        ) : myPendingRequest ? (
                          <Button
                            variant="outline"
                            className="w-full text-xs"
                            disabled={joinBusyId === t.id}
                            onClick={() => withdrawJoinRequest(t, myPendingRequest.id)}
                          >
                            {joinBusyId === t.id ? 'Withdrawing…' : 'Requested — Cancel'}
                          </Button>
                        ) : myTeamForThisHackathon ? (
                          <p className="rounded-lg border border-dashed border-bg-border py-2 text-center text-xs text-white/35">
                            Already on a team for this hackathon
                          </p>
                        ) : isFull ? (
                          <p className="rounded-lg border border-dashed border-bg-border py-2 text-center text-xs text-white/35">Team full</p>
                        ) : (
                          <Button className="w-full text-xs" disabled={joinBusyId === t.id} onClick={() => sendJoinRequest(t)}>
                            {joinBusyId === t.id ? 'Sending…' : 'Request to Join'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {hackathonTeams.length === 0 && (
                  <p className="col-span-full rounded-xl border border-dashed border-bg-border px-4 py-8 text-center text-xs text-white/30">
                    No teams have registered yet — be the first to create one.
                  </p>
                )}
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card className="lg:sticky lg:top-24">
            {viewAs === 'volunteer' ? (
              mySignup?.status === 'accepted' ? (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-volunteer" />
                    <h2 className="font-display text-base font-semibold">You're on the team</h2>
                  </div>
                  <p className="text-sm text-white/50">
                    Organizers can now assign you tasks for this event from their Task Board.
                  </p>
                </div>
              ) : mySignup?.status === 'pending' ? (
                <div>
                  <h2 className="mb-3 font-display text-base font-semibold">Request sent</h2>
                  <p className="text-sm text-white/50">
                    Your request to volunteer is waiting on approval from the organizing team.
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="mb-3 font-display text-base font-semibold">Volunteer for this event</h2>
                  <p className="mb-5 text-sm text-white/50">
                    Sign up and the organizing team will review your request before confirming your spot — no team
                    registration needed.
                  </p>
                  <Button className="w-full !bg-volunteer !text-black hover:brightness-110" onClick={() => volunteerSignUp(hackathon, user)}>
                    Request to Volunteer
                  </Button>
                </div>
              )
            ) : application ? (
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
                  <p className="flex items-center gap-1.5 text-white/70">
                    <Users2 size={13} className="text-student" /> You're registered as team leader
                  </p>
                  <p><span className="text-white/30">Problem statement 1:</span> {application.formData?.problemStatement1 || '—'}</p>
                  <p><span className="text-white/30">Problem statement 2:</span> {application.formData?.problemStatement2 || '—'}</p>
                </div>

                {application.formData?.pendingMembers?.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-medium text-white/60">Teammates ({application.formData.pendingMembers.length})</p>
                    <p className="mb-3 text-[11px] text-white/35">
                      Email or share the link below with each teammate — they'll open it, confirm their name/phone, and
                      fill in the rest of their own details.
                    </p>
                    <div className="space-y-2">
                      {application.formData.pendingMembers.map((m) => (
                        <div key={m.token} className="flex items-center justify-between gap-2 rounded-lg border border-bg-border bg-white/[0.02] px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium text-white/80">{m.name}</p>
                            <p className="truncate text-[11px] text-white/35">{m.email}</p>
                            <p className="text-[11px] text-white/35">{m.phone}</p>
                          </div>
                          {m.confirmed ? (
                            <Badge variant="success" className="shrink-0">Confirmed</Badge>
                          ) : (
                            <div className="flex shrink-0 items-center gap-1.5">
                              <a
                                href={mailtoInvite(m)}
                                className="flex items-center gap-1 rounded-md border border-bg-border px-2.5 py-1 text-[11px] font-medium text-white/60 hover:text-white"
                                title="Opens your email app with the invite pre-filled"
                              >
                                <Mail size={11} /> Email
                              </a>
                              <button
                                type="button"
                                onClick={() => copyLink(m.token)}
                                className="flex items-center gap-1 rounded-md border border-student/30 bg-student-soft px-2.5 py-1 text-[11px] font-medium text-student hover:brightness-110"
                              >
                                {copiedToken === m.token ? <Check size={11} /> : <Copy size={11} />} {copiedToken === m.token ? 'Copied' : 'Copy link'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 rounded-xl border border-bg-border bg-white/[0.02] p-4">
                  <p className="mb-2 text-xs font-medium text-white/60">Final submission</p>
                  {isFinalized ? (
                    <p className="flex items-center gap-1.5 text-xs text-student">
                      <CheckCircle2 size={13} /> Roster finalized — your team is locked in.
                    </p>
                  ) : (
                    <>
                      <ul className="mb-3 space-y-1 text-[11px] text-white/45">
                        <li className={teamSizeMet ? 'text-student' : ''}>
                          {teamSizeMet ? '✓' : '○'} {totalConfirmedCount}/{requiredTeamSize} members confirmed
                        </li>
                        {requiredFemaleMembers > 0 && (
                          <li className={femaleCountMet ? 'text-student' : ''}>
                            {femaleCountMet ? '✓' : '○'} {femaleCount}/{requiredFemaleMembers} confirmed female member{requiredFemaleMembers === 1 ? '' : 's'}
                          </li>
                        )}
                      </ul>
                      <Button
                        className="w-full"
                        disabled={!rosterComplete || finalizing}
                        onClick={submitFinal}
                        title={!rosterComplete ? 'Unlocks once every teammate has confirmed and the team meets the criteria above' : undefined}
                      >
                        {!rosterComplete && <Lock size={14} />} {finalizing ? 'Submitting…' : 'Final Submission'}
                      </Button>
                    </>
                  )}
                </div>

                {hackathon.community_links?.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-white/60">
                      <Link2 size={13} className="text-student" /> Join the community
                    </p>
                    {hackathon.community_links.map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-2 rounded-lg border border-student/30 bg-student-soft px-3.5 py-2.5 text-sm font-medium text-student transition hover:brightness-110"
                      >
                        {link.label || 'Join group'}
                        <ArrowUpRight size={14} />
                      </a>
                    ))}
                  </div>
                )}
                <Button variant="outline" as={Link} to="/dashboard/student/applications" className="mt-5 w-full">
                  View in Applications
                </Button>
                {application.status === 'accepted' && !application.team_id && (
                  <Button as={Link} to={`/dashboard/student/hackathons/${hackathon.id}/workspace`} className="mt-2 w-full">
                    Go to Workspace
                  </Button>
                )}
              </div>
            ) : !myTeamForThisHackathon ? (
              <div>
                <h2 className="mb-3 font-display text-base font-semibold">Register for this hackathon</h2>
                <p className="mb-5 text-sm text-white/50">
                  Create your team first — you'll get a team code to share, and this registration form unlocks for you
                  as the team leader right after.
                </p>
                <Button className="w-full" onClick={() => setTeamPanel('create')}>
                  <Plus size={14} /> Create Team
                </Button>
              </div>
            ) : myTeamForThisHackathon.leader_id !== user?.id ? (
              <div>
                <h2 className="mb-3 font-display text-base font-semibold">You're on {myTeamForThisHackathon.team_name}</h2>
                <p className="text-sm text-white/50">
                  Only your team leader can submit this hackathon's registration form — check in with them once your
                  team is ready.
                </p>
                <Button as={Link} to={`/dashboard/student/teams/${myTeamForThisHackathon.id}`} variant="outline" className="mt-4 w-full">
                  Open Team Workspace
                </Button>
              </div>
            ) : (
              <div>
                <h2 className="mb-4 font-display text-base font-semibold">Register for this hackathon</h2>
                <p className="mb-4 flex items-center gap-1.5 text-xs text-white/40">
                  <Users2 size={13} className="text-student" /> You register as the team leader — {maxMemberRows > 0 ? `add your ${maxMemberRows} teammate${maxMemberRows === 1 ? '' : 's'}' name and phone below,` : ''} each teammate then confirms their own spot via a link you share with them.
                </p>

                <form onSubmit={submit} className="space-y-5">
                  <div className="space-y-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/30">1. Your details (team leader)</p>
                    <Field label="Your name" htmlFor="leaderName">
                      <Input
                        id="leaderName"
                        required
                        value={leaderForm.name}
                        onChange={(e) => setLeaderForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </Field>
                    <Field label="Your email" htmlFor="leaderEmail">
                      <Input
                        id="leaderEmail"
                        type="email"
                        required
                        value={leaderForm.email}
                        onChange={(e) => setLeaderForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </Field>
                    <Field label="Your phone" htmlFor="leaderPhone">
                      <Input
                        id="leaderPhone"
                        required
                        placeholder="+91 XXXXX XXXXX"
                        value={leaderForm.phone}
                        onChange={(e) => setLeaderForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </Field>
                    <Field label="Your gender" htmlFor="leaderGender">
                      <Select id="leaderGender" required value={leaderForm.gender} onChange={(e) => setLeaderForm((f) => ({ ...f, gender: e.target.value }))}>
                        <option value="">Select</option>
                        {GENDER_OPTIONS.map((g) => (
                          <option key={g}>{g}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="College" htmlFor="college">
                      <Input id="college" value={FIXED_COLLEGE} disabled readOnly />
                    </Field>
                    <Field label="Year" htmlFor="year">
                      <Select id="year" value={leaderForm.year} onChange={(e) => setLeaderForm((f) => ({ ...f, year: e.target.value }))}>
                        <option>1st Year</option>
                        <option>2nd Year</option>
                        <option>3rd Year</option>
                        <option>4th Year</option>
                        <option>Other</option>
                      </Select>
                    </Field>
                  </div>

                  {maxMemberRows > 0 && (
                    <div className="space-y-3 border-t border-bg-border pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/30">
                        2. Your teammates ({memberRows.length}/{maxMemberRows})
                      </p>
                      <p className="text-[11px] text-white/35">
                        Name, email, and phone for now — they'll fill in the rest (college year, gender, GitHub, etc.)
                        themselves once you share their invite link.
                      </p>
                      {memberRows.map((row, index) => (
                        <div key={index} className="flex items-start gap-2 rounded-lg border border-bg-border bg-white/[0.02] p-3">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder={`Member ${index + 2} name`}
                              value={row.name}
                              onChange={(e) => updateMemberRow(index, 'name', e.target.value)}
                            />
                            <Input
                              type="email"
                              placeholder="Email address"
                              value={row.email}
                              onChange={(e) => updateMemberRow(index, 'email', e.target.value)}
                            />
                            <Input
                              placeholder="Mobile number"
                              value={row.phone}
                              onChange={(e) => updateMemberRow(index, 'phone', e.target.value)}
                            />
                          </div>
                          {memberRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMemberRow(index)}
                              className="mt-2 shrink-0 text-white/30 hover:text-red-400"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      {memberRows.length < maxMemberRows && (
                        <button
                          type="button"
                          onClick={addMemberRow}
                          className="flex items-center gap-1.5 text-xs font-medium text-student hover:underline"
                        >
                          <Plus size={13} /> Add teammate
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-4 border-t border-bg-border pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/30">3. Problem statements</p>
                    <Field label="Problem statement 1" htmlFor="problemStatement1" hint="Required.">
                      <Textarea
                        id="problemStatement1"
                        required
                        value={statements.problemStatement1}
                        onChange={(e) => setStatements((f) => ({ ...f, problemStatement1: e.target.value }))}
                      />
                    </Field>
                    <Field label="Problem statement 2 (optional)" htmlFor="problemStatement2">
                      <Textarea
                        id="problemStatement2"
                        value={statements.problemStatement2}
                        onChange={(e) => setStatements((f) => ({ ...f, problemStatement2: e.target.value }))}
                      />
                    </Field>
                    <Field label="Why do you want to join?" htmlFor="whyJoin">
                      <Textarea id="whyJoin" value={statements.whyJoin} onChange={(e) => setStatements((f) => ({ ...f, whyJoin: e.target.value }))} />
                    </Field>
                  </div>

                  {formError && <p className="text-xs text-red-400">{formError}</p>}

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit Registration'}
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
