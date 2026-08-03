import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CalendarDays, MapPin, Trophy, Users2, CheckCircle2, Clock, Link2, ArrowUpRight,
  Plus, KeyRound, X, UserRound, UserRoundX, Crown, Lock, PartyPopper,
} from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input, { Field, Textarea, Select } from '../../components/ui/Input'
import NoticeList from '../../components/dashboard/NoticeList'
import ExpandableText from '../../components/ui/ExpandableText'
import TeamAvatar from '../../components/teams/TeamAvatar'
import TeamRegistrationPanel from '../../components/teams/TeamRegistrationPanel'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, daysUntil, uid, TEAM_CAPACITY, GENDER_OPTIONS, COLLEGE_OPTIONS } from '../../lib/utils'

export default function HackathonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    hackathons, teams, getApplication, applyToOpportunity,
    finalizeApplication,
  } = useData()

  const hackathon = hackathons.find((h) => h.id === id)
  const application = getApplication(user?.id, id)

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

  const myTeamForThisHackathon = hackathonTeams.find((t) => t.members.some((m) => m.id === user?.id))

  // ---------- Registration (leader fills everyone upfront, teammates
  // confirm their own spot later via an invite link) ----------
  const [leaderForm, setLeaderForm] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    year: '2nd Year',
    gender: '',
    college: '',
  })
  const [memberRows, setMemberRows] = useState([{ name: '', email: '', phone: '' }])
  const [statements, setStatements] = useState({ problemStatement1: '', problemStatement2: '', whyJoin: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Teammates who already joined via the team code — their name/email/contact
  // came from their own Join Team submission, so we surface it here read-only
  // instead of asking the leader to retype it. Excludes the leader (they have
  // their own section above). This recomputes on every render, so as soon as
  // someone joins by code the form updates automatically.
  const joinedTeammates = (myTeamForThisHackathon?.members || []).filter(
    (m) => m.id !== myTeamForThisHackathon?.leader_id,
  )

  // Only offer reminder rows for teammates who genuinely haven't joined yet.
  // Previously this was a static requiredTeamSize - 1 regardless of how many
  // real members had already joined via the team code, so a leader with
  // 5/6 members already in would still see blank "Member 2" reminder slots
  // for people who were already on the team.
  const openTeamSlots = Math.max(0, requiredTeamSize - (myTeamForThisHackathon?.members?.length || 1))
  const maxMemberRows = openTeamSlots

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

    if (!leaderForm.name.trim() || !leaderForm.email.trim() || !leaderForm.phone.trim() || !leaderForm.gender || !leaderForm.college) {
      setFormError('Please fill in your name, email, phone number, gender, and college.')
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
      college: leaderForm.college,
      year: leaderForm.year,
      problemStatement1: statements.problemStatement1,
      problemStatement2: statements.problemStatement2,
      whyJoin: statements.whyJoin,
      pendingMembers,
    }

    const result = await applyToOpportunity({
      type: 'hackathon',
      opportunity: hackathon,
      user,
      formData,
      team: myTeamForThisHackathon,
      notifyApplicant: false,
      notifyOrganizer: false,
      status: 'draft',
    })
    setSubmitting(false)
    if (!result) {
      setFormError("Something went wrong saving your registration — please try again, or check your connection.")
    }
  }

  // ---------- Final submission gating ----------
  // Teammates now actually join through the team-code system (see the
  // "Create your team first" gate above), which lands them in
  // myTeamForThisHackathon.members live — so that's the roster to count
  // against, not application.formData.pendingMembers (that's a leftover
  // invite-link list from before a real team existed, and doesn't update
  // when someone joins by code). This is also why Final Submission wasn't
  // updating: it was watching the wrong list.
  const teamMembers = myTeamForThisHackathon?.members || []
  const totalConfirmedCount = teamMembers.length
  const femaleCount = femaleMemberCount(myTeamForThisHackathon)
  const teamSizeMet = totalConfirmedCount >= requiredTeamSize
  const femaleCountMet = femaleCount >= requiredFemaleMembers
  const rosterComplete = teamSizeMet && femaleCountMet
  const isFinalized = Boolean(application?.formData?.finalized)
  const [finalizing, setFinalizing] = useState(false)

  const submitFinal = async () => {
    setFinalizing(true)
    await finalizeApplication(application.id, { team: myTeamForThisHackathon })
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

      {hackathon.community_links?.some((link) => link.url) && (
        <Card className="mb-6 border-student/30 bg-student-soft/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <Link2 size={16} className="shrink-0 text-student" />
              Everyone must join the WhatsApp group to receive important notices and updates.
            </p>
            <div className="flex flex-wrap gap-2">
              {hackathon.community_links
                .filter((link) => link.url)
                .map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-student/30 bg-student px-3.5 py-2 text-sm font-semibold text-bg transition hover:brightness-110"
                  >
                    {link.label || 'Join group'} <ArrowUpRight size={14} />
                  </a>
                ))}
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-semibold">Create or Join a Team</h2>
                <p className="mt-0.5 text-xs text-white/40">
                  Create a team and you're the leader — join one with a team code and you're a member under that leader.
                </p>
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
          </Card>

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
            <ExpandableText
              text={hackathon.description}
              lines={3}
              accent="student"
              textClassName="text-sm leading-relaxed text-white/60"
            />

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
              <ExpandableText
                text={hackathon.rules}
                lines={3}
                accent="student"
                textClassName="text-sm leading-relaxed text-white/55"
              />
            </Card>
          )}

          <Card>
            <h2 className="mb-4 font-display text-base font-semibold">Notices & Updates</h2>
            <NoticeList notices={hackathon.notices} accent="student" expandable />
          </Card>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-semibold">Teams for this Hackathon</h2>
                  <p className="mt-0.5 text-xs text-white/40">Teams registered for {hackathon.title} — join one with a team code, or start your own.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {hackathonTeams.map((t) => {
                  const isMemberOfThisTeam = t.members.some((m) => m.id === user?.id)
                  const candidatesRemaining = Math.max(0, requiredTeamSize - t.members.length)
                  const femaleRemaining = Math.max(0, requiredFemaleMembers - femaleMemberCount(t))
                  const isFull = candidatesRemaining === 0

                  return (
                    <div key={t.id} className="flex flex-col rounded-xl border border-bg-border bg-white/[0.02] p-4">
                      <div className="flex items-start gap-3">
                        <TeamAvatar logo={t.logo} size="sm" />
                        <div className="min-w-0 flex-1">
                          <Link to={`/dashboard/student/teams/${t.id}`} className="block truncate font-display text-sm font-semibold hover:text-student">
                            {t.team_name}
                          </Link>
                          <p className="text-xs text-white/35">Lead by {t.leader_name || 'Team leader'}</p>
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

                      <div className="mt-4">
                        {isMemberOfThisTeam ? (
                          <Button as={Link} to={`/dashboard/student/teams/${t.id}`} className="w-full text-xs">
                            Your Team — Open Workspace
                          </Button>
                        ) : myTeamForThisHackathon ? (
                          <p className="rounded-lg border border-dashed border-bg-border py-2 text-center text-xs text-white/35">
                            Already on a team for this hackathon
                          </p>
                        ) : isFull ? (
                          <p className="rounded-lg border border-dashed border-bg-border py-2 text-center text-xs text-white/35">Team full</p>
                        ) : (
                          <p className="rounded-lg border border-dashed border-bg-border py-2 text-center text-xs text-white/35">
                            Ask the team leader for their team code to join
                          </p>
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
        </div>

        <div>
          <Card className="lg:sticky lg:top-24">
            {application ? (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  {isFinalized ? <CheckCircle2 size={18} className="text-student" /> : <Clock size={18} className="text-student" />}
                  <h2 className="font-display text-base font-semibold">
                    {isFinalized ? 'Registration submitted' : 'Finish building your roster'}
                  </h2>
                </div>
                <p className="text-sm text-white/50">
                  {isFinalized ? (
                    <>Status: <span className="font-medium capitalize text-white/80">{application.status.replace('_', ' ')}</span></>
                  ) : (
                    'Not sent to the organizer yet — this happens automatically once you hit Final Submission below.'
                  )}
                </p>
                <p className="mt-1 text-xs text-white/35">Draft saved {formatDate(application.created_at)}</p>

                <div className="mt-5 space-y-2 rounded-xl border border-bg-border bg-white/[0.02] p-4 text-xs text-white/45">
                  <p className="flex items-center gap-1.5 text-white/70">
                    <Users2 size={13} className="text-student" /> You're registered as team leader
                  </p>
                  <p><span className="text-white/30">Problem statement 1:</span> {application.formData?.problemStatement1 || '—'}</p>
                  <p><span className="text-white/30">Problem statement 2:</span> {application.formData?.problemStatement2 || '—'}</p>
                </div>

                {!isFinalized && application.formData?.pendingMembers?.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-medium text-white/60">Teammates ({application.formData.pendingMembers.length})</p>
                    <p className="mb-3 text-[11px] text-white/35">
                      Your teammates join using your team's join code — this list just tracks who's confirmed so far.
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
                            <Badge variant="neutral" className="shrink-0">Pending</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 rounded-xl border border-bg-border bg-white/[0.02] p-4">
                  <p className="mb-2 text-xs font-medium text-white/60">Final submission</p>
                  {isFinalized ? (
                    <div className="py-2 text-center">
                      <PartyPopper className="mx-auto mb-2 text-student" size={24} />
                      <p className="font-display text-sm font-semibold text-white">Your team is registered! 🎉</p>
                      <p className="mt-1 text-xs text-white/45">
                        Congrats — {myTeamForThisHackathon?.team_name || application.team_name} is locked in and sent to
                        the organizer. Every teammate has been emailed a confirmation.
                      </p>
                    </div>
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
                      <p className="mt-2 text-[11px] text-white/30">
                        The organizer only sees your team once you hit Final Submission — nothing is sent to them before that.
                      </p>
                    </>
                  )}
                </div>

                {isFinalized && hackathon.community_links?.length > 0 && (
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
                  <Users2 size={13} className="text-student" /> You register as the team leader. Your teammates should
                  already be on the team via your team code — the section below is just an optional way to email
                  anyone a reminder.
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
                      <Select id="college" required value={leaderForm.college} onChange={(e) => setLeaderForm((f) => ({ ...f, college: e.target.value }))}>
                        <option value="">Select</option>
                        {COLLEGE_OPTIONS.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
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

                  {joinedTeammates.length > 0 && (
                    <div className="space-y-3 border-t border-bg-border pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/30">
                        2. Team members
                      </p>
                      <p className="text-[11px] text-white/35">
                        Filled in automatically as teammates join using your team code.
                      </p>
                      {joinedTeammates.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-start gap-2 rounded-lg border border-student/30 bg-student-soft/10 p-3"
                        >
                          <div className="flex-1 space-y-2">
                            <Input value={m.name} readOnly disabled className="opacity-80" />
                            <Input value={m.email} readOnly disabled className="opacity-80" />
                            <Input value={m.contact || ''} readOnly disabled className="opacity-80" />
                          </div>
                          <span className="mt-2 flex shrink-0 items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-student">
                            <CheckCircle2 size={12} /> Joined
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {maxMemberRows > 0 && (
                    <div className="space-y-3 border-t border-bg-border pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-white/30">
                        {joinedTeammates.length > 0 ? '3. Email a teammate a reminder (optional)' : '2. Email a teammate a reminder (optional)'}
                      </p>
                      <p className="text-[11px] text-white/35">
                        Not required — your teammates already join through your team code. This just sends a reminder
                        email to anyone who hasn't joined yet.
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
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-white/30">
                      {joinedTeammates.length > 0 ? '4. Problem statements' : '3. Problem statements'}
                    </p>
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
