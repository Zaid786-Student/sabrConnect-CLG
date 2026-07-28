import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users2, X, Crown, Target, Link2, Trophy, PartyPopper, KeyRound, Copy, Check } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Field, Textarea, Select } from '../../components/ui/Input'
import TeamAvatar from '../../components/teams/TeamAvatar'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { DEV_ROLES, HACKATHON_INTERESTS, GENDER_OPTIONS, TEAM_CAPACITY, splitTags } from '../../lib/utils'

const CREATE_ERROR_MESSAGES = {
  ALREADY_REGISTERED: 'This email is already registered with a team.',
  UNKNOWN: 'Something went wrong. Please try again.',
}

const JOIN_ERROR_MESSAGES = {
  INVALID_CODE: "No team found with that code — double-check and try again.",
  TEAM_FULL: `This team already has its ${TEAM_CAPACITY} members.`,
  ALREADY_REGISTERED: 'This email is already registered with a team.',
  ALREADY_MEMBER: "You're already a member of this team.",
  UNKNOWN: 'Something went wrong. Please try again.',
}

export default function Teams() {
  const { user } = useAuth()
  const { teams, createTeam, joinTeamByCode } = useData()

  const [activeForm, setActiveForm] = useState(null) // null | 'create' | 'join'

  // ---------- Create Team ----------
  const [createForm, setCreateForm] = useState(() => ({
    team_name: '',
    leaderName: user?.full_name || '',
    leaderEmail: user?.email || '',
    leaderContact: '',
    leaderGithub: '',
    leaderLinkedin: '',
    leaderGender: '',
    description: '',
    project_name: '',
    goal: '',
    comm_link: '',
    creatorRole: DEV_ROLES[0],
    creatorSkills: '',
    rolesNeeded: [],
    interests: [],
  }))
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(null) // { teamName, teamCode }
  const [codeCopied, setCodeCopied] = useState(false)

  const toggleRoleNeeded = (role) => {
    setCreateForm((f) => ({
      ...f,
      rolesNeeded: f.rolesNeeded.includes(role) ? f.rolesNeeded.filter((r) => r !== role) : [...f.rolesNeeded, role],
    }))
  }

  const toggleInterest = (tag) => {
    setCreateForm((f) => ({
      ...f,
      interests: f.interests.includes(tag) ? f.interests.filter((t) => t !== tag) : [...f.interests, tag],
    }))
  }

  const resetCreateForm = () =>
    setCreateForm({
      team_name: '',
      leaderName: user?.full_name || '',
      leaderEmail: user?.email || '',
      leaderContact: '',
      leaderGithub: '',
      leaderLinkedin: '',
      leaderGender: '',
      description: '',
      project_name: '',
      goal: '',
      comm_link: '',
      creatorRole: DEV_ROLES[0],
      creatorSkills: '',
      rolesNeeded: [],
      interests: [],
    })

  const submitCreate = async (e) => {
    e.preventDefault()
    setCreateError('')
    if (
      !createForm.team_name.trim() ||
      !createForm.leaderName.trim() ||
      !createForm.leaderEmail.trim() ||
      !createForm.leaderContact.trim() ||
      !createForm.leaderGithub.trim() ||
      !createForm.leaderGender
    ) {
      setCreateError('Please fill in all required fields (name, email, contact, GitHub, gender).')
      return
    }
    setCreating(true)
    const result = await createTeam(
      { ...createForm, creatorSkills: splitTags(createForm.creatorSkills) },
      user,
    )
    setCreating(false)
    if (!result?.success) {
      setCreateError(CREATE_ERROR_MESSAGES[result?.error] || CREATE_ERROR_MESSAGES.UNKNOWN)
      return
    }
    setCreateSuccess({ teamName: result.team.team_name, teamCode: result.team.team_code })
    resetCreateForm()
  }

  const copyTeamCode = () => {
    if (!createSuccess) return
    navigator.clipboard?.writeText(createSuccess.teamCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 1500)
  }

  // ---------- Join Team (by code) ----------
  const [joinForm, setJoinForm] = useState(() => ({
    memberName: user?.full_name || '',
    memberEmail: user?.email || '',
    memberContact: '',
    memberGithub: '',
    memberLinkedin: '',
    memberGender: '',
    teamCode: '',
  }))
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinSuccess, setJoinSuccess] = useState(null) // { teamName }

  const resetJoinForm = () =>
    setJoinForm({
      memberName: user?.full_name || '',
      memberEmail: user?.email || '',
      memberContact: '',
      memberGithub: '',
      memberLinkedin: '',
      memberGender: '',
      teamCode: '',
    })

  const submitJoin = async (e) => {
    e.preventDefault()
    setJoinError('')
    if (
      !joinForm.memberName.trim() ||
      !joinForm.memberEmail.trim() ||
      !joinForm.memberContact.trim() ||
      !joinForm.teamCode.trim()
    ) {
      setJoinError('Please fill in all required fields, including the team code.')
      return
    }
    setJoining(true)
    const result = await joinTeamByCode(
      joinForm.teamCode,
      {
        name: joinForm.memberName,
        email: joinForm.memberEmail,
        contact: joinForm.memberContact,
        githubUrl: joinForm.memberGithub,
        linkedinUrl: joinForm.memberLinkedin,
        gender: joinForm.memberGender,
      },
      user,
    )
    setJoining(false)
    if (!result?.success) {
      setJoinError(JOIN_ERROR_MESSAGES[result?.error] || JOIN_ERROR_MESSAGES.UNKNOWN)
      return
    }
    setJoinSuccess({ teamName: result.team.team_name })
    resetJoinForm()
  }

  const closePanel = () => {
    setActiveForm(null)
    setCreateSuccess(null)
    setJoinSuccess(null)
    setCreateError('')
    setJoinError('')
  }

  return (
    <DashboardShell role="student" title="My Teams" subtitle="Register a new team or join one using a team code.">
      <div className="mb-6 flex flex-wrap justify-end gap-2.5">
        <Button
          variant={activeForm === 'create' ? 'primary' : 'outline'}
          onClick={() => {
            if (activeForm === 'create') {
              closePanel()
            } else {
              closePanel()
              setActiveForm('create')
            }
          }}
        >
          {activeForm === 'create' ? <X size={16} /> : <Plus size={16} />} Create Team
        </Button>
        <Button
          variant={activeForm === 'join' ? 'primary' : 'outline'}
          onClick={() => {
            if (activeForm === 'join') {
              closePanel()
            } else {
              closePanel()
              setActiveForm('join')
            }
          }}
        >
          {activeForm === 'join' ? <X size={16} /> : <KeyRound size={16} />} Join Team
        </Button>
      </div>

      {/* ---------------- Create Team panel ---------------- */}
      {activeForm === 'create' && (
        <Card className="mb-6">
          {createSuccess ? (
            <div className="py-4 text-center">
              <PartyPopper className="mx-auto mb-3 text-student" size={30} />
              <h3 className="font-display text-xl font-semibold">Registration successful! 🎉</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
                Congrats — <span className="text-white">{createSuccess.teamName}</span> is registered. Share this
                code with your teammates so they can join your team.
              </p>
              <div className="mx-auto mt-5 flex w-fit items-center gap-3 rounded-xl border border-student/30 bg-student-soft px-6 py-3">
                <span className="font-mono text-2xl font-bold tracking-[0.3em] text-student">
                  {createSuccess.teamCode}
                </span>
                <button
                  type="button"
                  onClick={copyTeamCode}
                  className="flex items-center gap-1 text-xs font-medium text-student/80 hover:text-student"
                >
                  {codeCopied ? <Check size={14} /> : <Copy size={14} />} {codeCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <Button className="mt-6" onClick={closePanel}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={submitCreate} className="grid gap-4 sm:grid-cols-2">
              <Field label="Team name" htmlFor="team_name" className="sm:col-span-2">
                <Input
                  id="team_name"
                  required
                  placeholder="e.g. Night Owls"
                  value={createForm.team_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, team_name: e.target.value }))}
                />
              </Field>

              <Field label="Leader's name" htmlFor="leaderName">
                <Input
                  id="leaderName"
                  required
                  placeholder="Full name"
                  value={createForm.leaderName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, leaderName: e.target.value }))}
                />
              </Field>
              <Field label="Leader's email" htmlFor="leaderEmail">
                <Input
                  id="leaderEmail"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={createForm.leaderEmail}
                  onChange={(e) => setCreateForm((f) => ({ ...f, leaderEmail: e.target.value }))}
                />
              </Field>
              <Field label="Leader's contact number" htmlFor="leaderContact">
                <Input
                  id="leaderContact"
                  required
                  placeholder="+91 XXXXX XXXXX"
                  value={createForm.leaderContact}
                  onChange={(e) => setCreateForm((f) => ({ ...f, leaderContact: e.target.value }))}
                />
              </Field>
              <Field label="Gender" htmlFor="leaderGender">
                <Select
                  id="leaderGender"
                  required
                  value={createForm.leaderGender}
                  onChange={(e) => setCreateForm((f) => ({ ...f, leaderGender: e.target.value }))}
                >
                  <option value="">Select</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </Select>
              </Field>
              <Field label="GitHub profile" htmlFor="leaderGithub">
                <Input
                  id="leaderGithub"
                  required
                  placeholder="https://github.com/username"
                  value={createForm.leaderGithub}
                  onChange={(e) => setCreateForm((f) => ({ ...f, leaderGithub: e.target.value }))}
                />
              </Field>
              <Field label="LinkedIn (optional)" htmlFor="leaderLinkedin">
                <Input
                  id="leaderLinkedin"
                  placeholder="https://linkedin.com/in/username"
                  value={createForm.leaderLinkedin}
                  onChange={(e) => setCreateForm((f) => ({ ...f, leaderLinkedin: e.target.value }))}
                />
              </Field>

              <Field label="What are you building?" htmlFor="description" className="sm:col-span-2">
                <Textarea
                  id="description"
                  placeholder="Short description for your team"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                />
              </Field>
              <Field label="Project name" htmlFor="project_name">
                <Input
                  id="project_name"
                  placeholder="e.g. CivicPing"
                  value={createForm.project_name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, project_name: e.target.value }))}
                />
              </Field>
              <Field label="Your role" htmlFor="creatorRole">
                <Select
                  id="creatorRole"
                  value={createForm.creatorRole}
                  onChange={(e) => setCreateForm((f) => ({ ...f, creatorRole: e.target.value }))}
                >
                  {DEV_ROLES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Your skills" htmlFor="creatorSkills" className="sm:col-span-2">
                <Input
                  id="creatorSkills"
                  placeholder="React, Python..."
                  value={createForm.creatorSkills}
                  onChange={(e) => setCreateForm((f) => ({ ...f, creatorSkills: e.target.value }))}
                />
              </Field>
              <Field label="Team goal" htmlFor="goal" className="sm:col-span-2">
                <Textarea
                  id="goal"
                  placeholder="What does success look like for this team?"
                  value={createForm.goal}
                  onChange={(e) => setCreateForm((f) => ({ ...f, goal: e.target.value }))}
                />
              </Field>
              <Field
                label="Communication link (optional)"
                htmlFor="comm_link"
                hint="Discord, WhatsApp, etc."
                className="sm:col-span-2"
              >
                <Input
                  id="comm_link"
                  placeholder="https://discord.gg/..."
                  value={createForm.comm_link}
                  onChange={(e) => setCreateForm((f) => ({ ...f, comm_link: e.target.value }))}
                />
              </Field>
              <Field label="Roles still needed" htmlFor="rolesNeeded" className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {DEV_ROLES.map((role) => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => toggleRoleNeeded(role)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        createForm.rolesNeeded.includes(role)
                          ? 'border-student/40 bg-student-soft text-student'
                          : 'border-bg-border text-white/50 hover:text-white'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Hackathon interests" className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {HACKATHON_INTERESTS.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        createForm.interests.includes(tag)
                          ? 'border-volunteer/40 bg-volunteer-soft text-volunteer'
                          : 'border-bg-border text-white/50 hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </Field>

              <p className="text-xs text-white/35 sm:col-span-2">
                Team size is fixed at {TEAM_CAPACITY} members (including you as leader) — {TEAM_CAPACITY - 1} open
                slots for teammates to join with your team code.
              </p>

              {createError && <p className="text-sm text-red-400 sm:col-span-2">{createError}</p>}

              <Button type="submit" className="sm:col-span-2 sm:w-fit" disabled={creating}>
                {creating ? 'Registering…' : 'Register Team'}
              </Button>
            </form>
          )}
        </Card>
      )}

      {/* ---------------- Join Team panel ---------------- */}
      {activeForm === 'join' && (
        <Card className="mb-6">
          {joinSuccess ? (
            <div className="py-4 text-center">
              <PartyPopper className="mx-auto mb-3 text-student" size={30} />
              <h3 className="font-display text-xl font-semibold">You're in! 🎉</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
                Congrats — you've successfully joined <span className="text-white">{joinSuccess.teamName}</span>.
                Head to My Teams to open your team's workspace.
              </p>
              <Button className="mt-6" onClick={closePanel}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={submitJoin} className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" htmlFor="memberName">
                <Input
                  id="memberName"
                  required
                  placeholder="Full name"
                  value={joinForm.memberName}
                  onChange={(e) => setJoinForm((f) => ({ ...f, memberName: e.target.value }))}
                />
              </Field>
              <Field label="Your email" htmlFor="memberEmail">
                <Input
                  id="memberEmail"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={joinForm.memberEmail}
                  onChange={(e) => setJoinForm((f) => ({ ...f, memberEmail: e.target.value }))}
                />
              </Field>
              <Field label="Contact number" htmlFor="memberContact">
                <Input
                  id="memberContact"
                  required
                  placeholder="+91 XXXXX XXXXX"
                  value={joinForm.memberContact}
                  onChange={(e) => setJoinForm((f) => ({ ...f, memberContact: e.target.value }))}
                />
              </Field>
              <Field label="Gender" htmlFor="memberGender">
                <Select
                  id="memberGender"
                  value={joinForm.memberGender}
                  onChange={(e) => setJoinForm((f) => ({ ...f, memberGender: e.target.value }))}
                >
                  <option value="">Select</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </Select>
              </Field>
              <Field label="GitHub profile (optional)" htmlFor="memberGithub">
                <Input
                  id="memberGithub"
                  placeholder="https://github.com/username"
                  value={joinForm.memberGithub}
                  onChange={(e) => setJoinForm((f) => ({ ...f, memberGithub: e.target.value }))}
                />
              </Field>
              <Field label="LinkedIn (optional)" htmlFor="memberLinkedin">
                <Input
                  id="memberLinkedin"
                  placeholder="https://linkedin.com/in/username"
                  value={joinForm.memberLinkedin}
                  onChange={(e) => setJoinForm((f) => ({ ...f, memberLinkedin: e.target.value }))}
                />
              </Field>

              <Field
                label="Team code"
                htmlFor="teamCode"
                hint="Ask your team leader for the code they got after registering."
                className="sm:col-span-2"
              >
                <Textarea
                  id="teamCode"
                  required
                  placeholder="e.g. K7P2XQ"
                  value={joinForm.teamCode}
                  onChange={(e) => setJoinForm((f) => ({ ...f, teamCode: e.target.value.toUpperCase() }))}
                  className="min-h-[60px] font-mono tracking-widest"
                />
              </Field>

              {joinError && <p className="text-sm text-red-400 sm:col-span-2">{joinError}</p>}

              <Button type="submit" className="sm:col-span-2 sm:w-fit" disabled={joining}>
                {joining ? 'Joining…' : 'Join Team'}
              </Button>
            </form>
          )}
        </Card>
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
      </div>
    </DashboardShell>
  )
}
