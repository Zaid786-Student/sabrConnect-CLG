import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, LayoutGrid, Users2, MessageSquare, Megaphone, FolderOpen,
  Send, Plus, Trophy, Target, Link2, Lock, Pencil, X, Check, Trash2,
  Paperclip, Megaphone as MegaphoneIcon, File as FileIcon, Download, Rocket,
  Github, ExternalLink, Video, UserPlus, KeyRound, Copy,
} from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Field, Textarea, Select } from '../../components/ui/Input'
import NoticeList from '../../components/dashboard/NoticeList'
import TeamAvatar from '../../components/teams/TeamAvatar'
import MemberProfileCard from '../../components/teams/MemberProfileCard'
import JoinRequestRow from '../../components/teams/JoinRequestRow'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { usePresence, useTyping } from '../../lib/presence'
import { DEV_ROLES, HACKATHON_INTERESTS, TEAM_LOGO_OPTIONS, TEAM_CAPACITY, PROJECT_THEMES, PROJECT_STAGES, formatDate, splitTags, initials } from '../../lib/utils'

const MAX_FILE_BYTES = 2 * 1024 * 1024 // 2MB — demo-safe size for localStorage-backed file sharing

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'members', label: 'Members', icon: Users2 },
  { id: 'requests', label: 'Join Requests', icon: UserPlus, leaderOnly: true },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'resources', label: 'Shared Resources', icon: FolderOpen },
  { id: 'project', label: 'Submit Project', icon: Rocket },
]

export default function TeamWorkspace() {
  const { id } = useParams()
  const { user } = useAuth()
  const {
    teams, hackathons, internships, applications,
    assignLeader, updateMemberProfile, updateTeamProfile, addTeamAchievement,
    addTeamAnnouncement, addTeamResource, removeTeamResource, sendTeamMessage,
    submitProject, submitTeamInternshipProject, getSubmission, getInternshipSubmission,
    approveJoinRequest, rejectJoinRequest,
  } = useData()
  const [tab, setTab] = useState('overview')

  const team = teams.find((t) => t.id === id)

  if (!team) {
    return (
      <DashboardShell role="student" title="Team not found" subtitle="This team may have been removed.">
        <Card className="text-center text-sm text-white/50">
          <p>We couldn&apos;t find that team.</p>
          <Button as={Link} to="/dashboard/student/teams" variant="outline" className="mt-4">
            <ArrowLeft size={15} /> Back to My Teams
          </Button>
        </Card>
      </DashboardShell>
    )
  }

  const isMember = team.members.some((m) => m.id === user?.id)
  const isLeader = team.leader_id === user?.id
  // "Submit Project" needs a specific hackathon to submit against. A team
  // gets one either by being created directly for a hackathon
  // (team.opportunity_id), or — the far more common path — by later
  // applying to a hackathon as an existing team, which is recorded as an
  // accepted `applications` row rather than back-filling team.opportunity_id.
  // Checking both means the tab shows up correctly either way.
  const acceptedHackathonApp = applications.find(
    (a) => a.team_id === team.id && a.opportunity_type === 'hackathon' && a.status === 'accepted',
  )
  const acceptedInternshipApp = applications.find(
    (a) => a.team_id === team.id && a.opportunity_type === 'internship' && a.status === 'accepted',
  )
  const isHackathonTeam = team.opportunity_type ? team.opportunity_type === 'hackathon' : true
  const hackathonId = (isHackathonTeam && team.opportunity_id) || acceptedHackathonApp?.opportunity_id
  const internshipId = (!isHackathonTeam && team.opportunity_id) || acceptedInternshipApp?.opportunity_id
  // Submit Project stays locked until the team leader has registered this
  // team for a hackathon (or internship) — i.e. hackathonId/internshipId is
  // only set once that registration exists (see the comment above).
  const projectUnlocked = Boolean(hackathonId || internshipId)
  const baseTabs = TABS.filter((t) => !t.leaderOnly || isLeader)
  const pendingRequestCount = (team.joinRequests || []).filter((r) => r.status === 'pending').length

  // "Open positions" is derived live from the team's actual capacity minus
  // its current roster, rather than trusted from team.openSlots — that
  // field is also directly overwritable via the "Edit" form below, so it
  // could silently drift from reality (e.g. saving any other profile edit
  // would resubmit whatever stale number was in the form, undoing joins
  // that happened in the meantime). Capacity comes from the hackathon's own
  // team_size when this team is tied to one, falling back to the app-wide
  // default otherwise.
  const teamCapacity = (hackathonId && hackathons.find((h) => h.id === hackathonId)?.team_size) || TEAM_CAPACITY
  const openPositions = Math.max(0, teamCapacity - team.members.length)

  // The back link points wherever this team is actually registered — the
  // hackathon detail page for a hackathon team, the internship detail page
  // for an internship team, and the My Teams list only as a fallback for a
  // team that isn't registered against anything yet.
  const backTo = hackathonId
    ? { to: `/dashboard/student/hackathons/${hackathonId}`, label: 'Back to Hackathon' }
    : internshipId
      ? { to: `/dashboard/student/internships/${internshipId}`, label: 'Back to Internship' }
      : { to: '/dashboard/student/teams', label: 'Back to My Teams' }

  return (
    <DashboardShell role="student" title={team.team_name} subtitle={team.opportunity_title ? `Team workspace · ${team.opportunity_title}` : 'Team workspace'}>
      <Link to={backTo.to} className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white">
        <ArrowLeft size={13} /> {backTo.label}
      </Link>

      <div className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-bg-border bg-white/[0.02] p-1.5">
        {baseTabs.map(({ id: tabId, label, icon: Icon }) => {
          const locked = (!isMember && tabId !== 'overview') || (tabId === 'project' && isMember && !projectUnlocked)
          return (
            <button
              key={tabId}
              onClick={() => !locked && setTab(tabId)}
              disabled={locked}
              title={tabId === 'project' && locked && isMember ? 'Unlocks once your team leader registers this team for a hackathon or internship' : undefined}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                tab === tabId ? 'bg-student-soft text-student' : locked ? 'text-white/25' : 'text-white/55 hover:text-white'
              }`}
            >
              {locked ? <Lock size={13} /> : <Icon size={13} />}
              {label}
              {tabId === 'requests' && pendingRequestCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-student px-1 text-[10px] font-bold text-black">
                  {pendingRequestCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          team={team}
          user={user}
          isMember={isMember}
          isLeader={isLeader}
          updateTeamProfile={updateTeamProfile}
          addTeamAchievement={addTeamAchievement}
          openPositions={openPositions}
        />
      )}

      {tab === 'members' && isMember && (
        <MembersTab
          team={team}
          user={user}
          isLeader={isLeader}
          updateMemberProfile={updateMemberProfile}
          assignLeader={assignLeader}
        />
      )}

      {tab === 'requests' && isLeader && (
        <RequestsTab team={team} approveJoinRequest={approveJoinRequest} rejectJoinRequest={rejectJoinRequest} />
      )}

      {tab === 'chat' && isMember && <ChatTab team={team} user={user} isLeader={isLeader} sendTeamMessage={sendTeamMessage} />}

      {tab === 'announcements' && isMember && (
        <AnnouncementsTab team={team} user={user} isLeader={isLeader} addTeamAnnouncement={addTeamAnnouncement} />
      )}

      {tab === 'resources' && isMember && (
        <ResourcesTab team={team} user={user} isLeader={isLeader} addTeamResource={addTeamResource} removeTeamResource={removeTeamResource} />
      )}

      {tab === 'project' && isMember && projectUnlocked && (
        <ProjectTab
          team={team}
          hackathonId={hackathonId}
          internshipId={internshipId}
          hackathons={hackathons}
          internships={internships}
          submitProject={submitProject}
          submitTeamInternshipProject={submitTeamInternshipProject}
          getSubmission={getSubmission}
          getInternshipSubmission={getInternshipSubmission}
        />
      )}
    </DashboardShell>
  )
}

// ---------------------------------------------------------------------------
function OverviewTab({ team, user, isMember, isLeader, updateTeamProfile, addTeamAchievement, openPositions }) {
  const [editing, setEditing] = useState(false)
  const [achieveForm, setAchieveForm] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)

  const copyTeamCode = () => {
    if (!team.team_code) return
    navigator.clipboard?.writeText(team.team_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 1500)
  }
  const [form, setForm] = useState({
    logo: team.logo || '🚀',
    description: team.description || '',
    goal: team.goal || '',
    project_name: team.project_name || '',
    comm_link: team.comm_link || '',
    interests: team.interests || [],
    rolesNeeded: team.rolesNeeded || [],
  })

  const toggleInterest = (tag) =>
    setForm((f) => ({ ...f, interests: f.interests.includes(tag) ? f.interests.filter((t) => t !== tag) : [...f.interests, tag] }))
  const toggleRole = (role) =>
    setForm((f) => ({ ...f, rolesNeeded: f.rolesNeeded.includes(role) ? f.rolesNeeded.filter((r) => r !== role) : [...f.rolesNeeded, role] }))

  const saveProfile = (e) => {
    e.preventDefault()
    updateTeamProfile(team.id, form)
    setEditing(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <TeamAvatar logo={team.logo} size="lg" />
            <div>
              <h2 className="font-display text-xl font-semibold">{team.team_name}</h2>
              {team.opportunity_title && <p className="mt-0.5 text-xs text-white/35">For {team.opportunity_title}</p>}
              <p className="mt-2 max-w-xl text-sm text-white/55">{team.description}</p>
            </div>
          </div>
          {isLeader && !editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white">
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={saveProfile} className="mt-5 space-y-4 rounded-xl border border-bg-border bg-white/[0.02] p-4">
            <Field label="Team logo">
              <div className="flex flex-wrap gap-2">
                {TEAM_LOGO_OPTIONS.map((emoji) => (
                  <button
                    type="button"
                    key={emoji}
                    onClick={() => setForm((f) => ({ ...f, logo: emoji }))}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base ${form.logo === emoji ? 'border-student bg-student-soft' : 'border-bg-border bg-white/[0.02]'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Description" htmlFor="edit-desc">
              <Textarea id="edit-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
            <Field label="Goal" htmlFor="edit-goal">
              <Textarea id="edit-goal" value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name" htmlFor="edit-project">
                <Input id="edit-project" value={form.project_name} onChange={(e) => setForm((f) => ({ ...f, project_name: e.target.value }))} />
              </Field>
            </div>
            <Field label="Communication link" htmlFor="edit-comm">
              <Input id="edit-comm" value={form.comm_link} onChange={(e) => setForm((f) => ({ ...f, comm_link: e.target.value }))} placeholder="https://discord.gg/..." />
            </Field>
            <Field label="Hackathon interests">
              <div className="flex flex-wrap gap-2">
                {HACKATHON_INTERESTS.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleInterest(tag)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${form.interests.includes(tag) ? 'border-student/40 bg-student-soft text-student' : 'border-bg-border text-white/50 hover:text-white'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Roles still needed">
              <div className="flex flex-wrap gap-2">
                {DEV_ROLES.map((role) => (
                  <button
                    type="button"
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${form.rolesNeeded.includes(role) ? 'border-volunteer/40 bg-volunteer-soft text-volunteer' : 'border-bg-border text-white/50 hover:text-white'}`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex gap-2">
              <Button type="submit"><Check size={14} /> Save changes</Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}><X size={14} /> Cancel</Button>
            </div>
          </form>
        ) : (
          <>
            {team.goal && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-bg-border bg-white/[0.02] px-3 py-2.5 text-xs text-white/50">
                <Target size={13} className="mt-0.5 shrink-0 text-student" />
                <span><span className="text-white/30">Goal:</span> {team.goal}</span>
              </div>
            )}
            {team.comm_link && (
              <a href={team.comm_link} target="_blank" rel="noreferrer" className="mt-3 flex w-fit items-center gap-1.5 text-xs text-volunteer hover:underline">
                <Link2 size={12} /> Open team communication link
              </a>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat label="Members" value={team.members.length} />
              <MiniStat label="Open positions" value={openPositions} />
              <MiniStat label="Leader" value={team.leader_name?.split(' ')[0] || '—'} />
              <MiniStat label="Achievements" value={team.achievements?.length || 0} />
            </div>

            {team.interests?.length > 0 && (
              <TagRow label="Hackathon interests" items={team.interests} tone="volunteer" />
            )}
            {team.skills?.length > 0 && <TagRow label="Skills on this team" items={team.skills} />}
            {team.rolesNeeded?.length > 0 && <TagRow label="Looking for" items={team.rolesNeeded} tone="volunteer" />}
          </>
        )}
      </Card>

      {isMember && team.team_code && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <KeyRound size={15} className="text-student" /> Team code
              </div>
              <p className="mt-1 text-xs text-white/45">Share this with teammates so they can join your team.</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-student/30 bg-student-soft px-5 py-2.5">
              <span className="font-mono text-lg font-bold tracking-[0.3em] text-student">{team.team_code}</span>
              <button
                type="button"
                onClick={copyTeamCode}
                className="flex items-center gap-1 text-xs font-medium text-student/80 hover:text-student"
              >
                {codeCopied ? <Check size={14} /> : <Copy size={14} />} {codeCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {!isMember && (
        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users2 size={15} className="text-student" /> Want in?
          </div>
          <p className="mt-3 text-sm text-white/50">
            Ask {team.leader_name || 'the team leader'} for this team's join code, then use{' '}
            <span className="text-white/70">Join Team</span> on the My Teams page to hop in.
          </p>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Trophy size={15} className="text-organizer" /> Team achievements
          </div>
        </div>
        {isLeader && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              addTeamAchievement(team.id, achieveForm)
              setAchieveForm('')
            }}
          >
            <Input value={achieveForm} onChange={(e) => setAchieveForm(e.target.value)} placeholder="e.g. Winner — GreenStack Climate Hack" className="flex-1" />
            <Button type="submit" variant="outline"><Plus size={14} /></Button>
          </form>
        )}
        <div className="mt-3 space-y-2">
          {(team.achievements || []).length === 0 && <p className="text-xs text-white/30">No achievements added yet.</p>}
          {(team.achievements || []).map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 rounded-lg border border-bg-border bg-white/[0.02] px-3.5 py-2.5 text-sm text-white/70">
              <Trophy size={13} className="shrink-0 text-organizer" /> {a.title}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-bg-border bg-white/[0.02] px-3.5 py-3">
      <p className="font-display text-lg font-semibold">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/40">{label}</p>
    </div>
  )
}

function TagRow({ label, items, tone = 'default' }) {
  const toneClass = tone === 'volunteer' ? 'border-volunteer/30 bg-volunteer-soft text-volunteer' : 'border-bg-border text-white/45'
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[11px] uppercase tracking-wide text-white/30">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span key={i} className={`rounded-full border px-2.5 py-1 text-xs ${toneClass}`}>{i}</span>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leader-only: approve or reject students who asked to join via the
// hackathon's Teams section. Pending requests surface first so the leader
// doesn't have to scroll past ones already handled.
function RequestsTab({ team, approveJoinRequest, rejectJoinRequest }) {
  const requests = [...(team.joinRequests || [])].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (a.status !== 'pending' && b.status === 'pending') return 1
    return new Date(b.created_at) - new Date(a.created_at)
  })

  if (requests.length === 0) {
    return (
      <Card className="text-center text-sm text-white/40">
        No join requests yet. Share your team code, or students can send a request from the hackathon's Teams tab.
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <JoinRequestRow
          key={r.id}
          request={r}
          onApprove={() => approveJoinRequest(team.id, r.id)}
          onReject={() => rejectJoinRequest(team.id, r.id)}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
function MembersTab({ team, user, isLeader, updateMemberProfile, assignLeader }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {team.members.map((m) => (
          <MemberProfileCard
            key={m.id}
            member={m}
            isSelf={m.id === user?.id}
            canManage={isLeader}
            onSave={(updates) => updateMemberProfile(team.id, m.id, updates)}
            onMakeLeader={() => assignLeader(team.id, m.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function ChatTab({ team, user, isLeader, sendTeamMessage }) {
  const [text, setText] = useState('')
  const [asAnnouncement, setAsAnnouncement] = useState(false)
  const [fileError, setFileError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const scrollRef = useRef(null)

  const online = usePresence(user)
  const { typingNames, notifyTyping, notifyStopTyping } = useTyping(`team-${team.id}`, user)

  const messages = useMemo(
    () => [...(team.messages || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [team.messages],
  )

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const handleTextChange = (e) => {
    setText(e.target.value)
    if (e.target.value.trim()) notifyTyping()
    else notifyStopTyping()
  }

  const submit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    sendTeamMessage(team.id, text, user, { type: asAnnouncement && isLeader ? 'announcement' : 'text' })
    setText('')
    setAsAnnouncement(false)
    notifyStopTyping()
  }

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileError('')
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File too large — please share files under 2MB.')
      return
    }
    setUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      sendTeamMessage(team.id, `📎 ${file.name}`, user, {
        type: asAnnouncement && isLeader ? 'announcement' : 'file',
        attachment: { name: file.name, size: file.size, mime: file.type, dataUrl },
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="flex h-[560px] flex-col p-0">
      <div className="flex items-center justify-between border-b border-bg-border px-5 py-3.5">
        <div>
          <p className="text-sm font-semibold">{team.team_name} chat</p>
          <p className="text-xs text-white/35">
            {team.members.length} members ·{' '}
            <span className="text-student">{team.members.filter((m) => online[m.id]).length} online</span>
          </p>
        </div>
        <div className="flex -space-x-2">
          {team.members.map((m) => (
            <span
              key={m.id}
              title={online[m.id] ? `${m.name} · online` : m.name}
              className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-card bg-white/[0.06] text-[10px] font-semibold text-white/70"
            >
              {initials(m.name)}
              {online[m.id] && (
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-card bg-student" />
              )}
            </span>
          ))}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && <p className="pt-10 text-center text-xs text-white/30">No messages yet — say hello 👋</p>}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id
          if (m.type === 'announcement') {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="flex max-w-[85%] items-start gap-2 rounded-xl border border-organizer/30 bg-organizer-soft px-4 py-3">
                  <MegaphoneIcon size={15} className="mt-0.5 shrink-0 text-organizer" />
                  <div>
                    <p className="text-[11px] font-semibold text-organizer">{m.sender_name} · Team Announcement</p>
                    <p className="mt-0.5 text-sm text-white/85">{m.text}</p>
                    {m.attachment && <FileBubble attachment={m.attachment} tone="organizer" />}
                    <p className="mt-1 text-[10px] text-white/35">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            )
          }
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-student text-black' : 'border border-bg-border bg-white/[0.03] text-white/80'}`}>
                {!mine && <p className="mb-0.5 text-[11px] font-semibold text-student">{m.sender_name}</p>}
                {m.type === 'file' && m.attachment ? (
                  <FileBubble attachment={m.attachment} tone={mine ? 'mine' : 'theirs'} />
                ) : (
                  <p>{m.text}</p>
                )}
                <p className={`mt-1 text-[10px] ${mine ? 'text-black/50' : 'text-white/30'}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-bg-border">
        {typingNames.length > 0 && (
          <p className="px-5 pt-2 text-[11px] italic text-white/40">
            {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…
          </p>
        )}
        {fileError && <p className="px-5 pt-2 text-[11px] text-red-400">{fileError}</p>}
        {isLeader && (
          <label className="flex items-center gap-1.5 px-5 pt-2 text-[11px] text-white/45">
            <input
              type="checkbox"
              checked={asAnnouncement}
              onChange={(e) => setAsAnnouncement(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-bg-border accent-organizer"
            />
            Post as team announcement
          </label>
        )}
        <form onSubmit={submit} className="flex items-center gap-2 p-3">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bg-border text-white/50 hover:text-white disabled:opacity-50"
            title="Share a file"
          >
            <Paperclip size={15} />
          </button>
          <Input
            value={text}
            onChange={handleTextChange}
            onBlur={notifyStopTyping}
            placeholder={asAnnouncement ? 'Write an announcement for the team...' : 'Message your team...'}
            className="flex-1"
          />
          <Button type="submit" className="px-3.5"><Send size={15} /></Button>
        </form>
      </div>
    </Card>
  )
}

function FileBubble({ attachment, tone }) {
  const isImage = attachment.mime?.startsWith('image/')
  const toneClass = tone === 'mine' ? 'border-black/15 bg-black/10' : tone === 'organizer' ? 'border-organizer/20 bg-black/10' : 'border-bg-border bg-white/[0.03]'
  return (
    <a
      href={attachment.dataUrl}
      download={attachment.name}
      className={`mt-1.5 flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs hover:opacity-90 ${toneClass}`}
    >
      {isImage ? (
        <img src={attachment.dataUrl} alt={attachment.name} className="h-9 w-9 rounded object-cover" />
      ) : (
        <FileIcon size={16} className="shrink-0 opacity-70" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{attachment.name}</span>
        <span className="block opacity-60">{Math.max(1, Math.round(attachment.size / 1024))} KB</span>
      </span>
      <Download size={13} className="shrink-0 opacity-60" />
    </a>
  )
}

// ---------------------------------------------------------------------------
function AnnouncementsTab({ team, user, isLeader, addTeamAnnouncement }) {
  const [form, setForm] = useState({ title: '', content: '' })
  const [showForm, setShowForm] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    addTeamAnnouncement(team.id, form, user)
    setForm({ title: '', content: '' })
    setShowForm(false)
  }

  return (
    <div className="space-y-5">
      {isLeader && (
        <Card>
          {showForm ? (
            <form onSubmit={submit} className="space-y-3">
              <Field label="Title" htmlFor="ann-title">
                <Input id="ann-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </Field>
              <Field label="Message" htmlFor="ann-content">
                <Textarea id="ann-content" value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
              </Field>
              <div className="flex gap-2">
                <Button type="submit">Post Announcement</Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <Button onClick={() => setShowForm(true)}><Plus size={14} /> New Announcement</Button>
          )}
        </Card>
      )}
      <NoticeList notices={team.teamAnnouncements} accent="student" emptyText="No announcements from the team leader yet." />
    </div>
  )
}

// ---------------------------------------------------------------------------
function ResourcesTab({ team, user, isLeader, addTeamResource, removeTeamResource }) {
  const [mode, setMode] = useState('link') // 'link' | 'file'
  const [form, setForm] = useState({ title: '', url: '' })
  const [showForm, setShowForm] = useState(false)
  const [fileError, setFileError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const submitLink = (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.url.trim()) return
    addTeamResource(team.id, { title: form.title, url: form.url }, user)
    setForm({ title: '', url: '' })
    setShowForm(false)
  }

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setFileError('')
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File too large — please share documents under 2MB.')
      return
    }
    setUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      addTeamResource(team.id, { title: file.name, url: dataUrl, isFile: true, size: file.size }, user)
      setShowForm(false)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        {showForm ? (
          <div className="space-y-3">
            <div className="flex gap-1.5 rounded-xl border border-bg-border bg-white/[0.02] p-1.5">
              <button
                type="button"
                onClick={() => setMode('link')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${mode === 'link' ? 'bg-student-soft text-student' : 'text-white/55 hover:text-white'}`}
              >
                Add a link
              </button>
              <button
                type="button"
                onClick={() => setMode('file')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${mode === 'file' ? 'bg-student-soft text-student' : 'text-white/55 hover:text-white'}`}
              >
                Upload a document
              </button>
            </div>

            {mode === 'link' ? (
              <form onSubmit={submitLink} className="grid gap-3 sm:grid-cols-2">
                <Field label="Title" htmlFor="res-title">
                  <Input id="res-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Figma file, doc, repo..." required />
                </Field>
                <Field label="Link" htmlFor="res-url">
                  <Input id="res-url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." required />
                </Field>
                <div className="flex gap-2 sm:col-span-2">
                  <Button type="submit">Add Resource</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} />
                {fileError && <p className="text-xs text-red-400">{fileError}</p>}
                <p className="text-xs text-white/40">Documents under 2MB — PDF, Doc, image, or any file your team needs to share.</p>
                <div className="flex gap-2">
                  <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Plus size={14} /> {uploading ? 'Uploading...' : 'Choose a file'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Button onClick={() => setShowForm(true)}><Plus size={14} /> Share a Resource</Button>
        )}
      </Card>

      <div className="space-y-2.5">
        {(team.resources || []).length === 0 && (
          <p className="rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/30">
            No shared resources yet.
          </p>
        )}
        {(team.resources || []).map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-bg-border bg-white/[0.02] px-4 py-3">
            <a
              href={r.url}
              target={r.isFile ? undefined : '_blank'}
              download={r.isFile ? r.title : undefined}
              rel="noreferrer"
              className="flex min-w-0 items-center gap-2.5 text-sm text-white/80 hover:text-student"
            >
              {r.isFile ? <FileIcon size={15} className="shrink-0 text-volunteer" /> : <FolderOpen size={15} className="shrink-0 text-volunteer" />}
              <span className="min-w-0 truncate">
                {r.title}
                <span className="ml-2 text-[11px] text-white/30">added by {r.added_by} · {formatDate(r.created_at)}</span>
              </span>
            </a>
            {(isLeader || r.added_by === user?.full_name) && (
              <button onClick={() => removeTeamResource(team.id, r.id)} className="shrink-0 text-white/30 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
// ---------------------------------------------------------------------------
function ProjectTab({ team, hackathonId, internshipId, hackathons, internships, submitProject, submitTeamInternshipProject, getSubmission, getInternshipSubmission }) {
  // This tab only ever renders once the team leader has registered the team
  // for a hackathon or internship (see projectUnlocked in TeamWorkspace above),
  // so there's no picker here — the opportunity is always whichever one the
  // team is registered for, auto-selected.
  const activeType = hackathonId ? 'hackathon' : 'internship'
  const activeId = hackathonId || internshipId

  const opportunity =
    activeType === 'hackathon'
      ? hackathons.find((h) => h.id === activeId)
      : internships.find((i) => i.id === activeId)

  const existing =
    activeType === 'hackathon'
      ? getSubmission(team.id, activeId)
      : getInternshipSubmission(team.id, activeId)

  const ended = opportunity?.end_date ? new Date(opportunity.end_date) < new Date() : false
  // Submissions used to stay locked until the hackathon's start date, but
  // any team that has finished final registration (projectUnlocked, checked
  // by the parent before this tab even renders) should be able to submit
  // right away — there's no separate "wait for the event to start" gate.

  const [editing, setEditing] = useState(!existing)
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pptError, setPptError] = useState('')
  const [pptUploading, setPptUploading] = useState(false)
  const pptInputRef = useRef(null)
  const [form, setForm] = useState({
    project_title: existing?.project_title || team.project_name || '',
    problem_statement: existing?.problem_statement || '',
    theme: existing?.theme || '',
    description: existing?.description || '',
    ppt_url: existing?.ppt_url || '',
    ppt_file_name: existing?.ppt_file_name || '',
    stage: existing?.stage || '',
    repo_url: existing?.repo_url || '',
    demo_url: existing?.demo_url || '',
    video_url: existing?.video_url || '',
    tech_stack: (existing?.tech_stack || []).join(', '),
  })

  // PPT upload — same data-URL pattern used for shared resources. Picking a
  // new file always replaces whatever was previously attached.
  const handlePptPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPptError('')
    if (file.size > MAX_FILE_BYTES) {
      setPptError('File too large — please upload a PPT under 2MB.')
      return
    }
    setPptUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      setForm((f) => ({ ...f, ppt_url: dataUrl, ppt_file_name: file.name }))
    } finally {
      setPptUploading(false)
    }
  }

  const removePpt = () => setForm((f) => ({ ...f, ppt_url: '', ppt_file_name: '' }))

  const submit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    if (!form.project_title.trim() || !form.problem_statement.trim() || !form.theme || !form.description.trim() || !form.stage) return

    const submitFn = activeType === 'hackathon' ? submitProject : submitTeamInternshipProject
    if (typeof submitFn !== 'function') {
      // eslint-disable-next-line no-console
      console.error(`submit${activeType === 'hackathon' ? 'Project' : 'TeamInternshipProject'} was not passed down to ProjectTab — check TeamWorkspace's useData() destructure and the <ProjectTab /> props.`)
      setSubmitError('This submission type isn\u2019t wired up correctly yet. Please contact support.')
      return
    }

    setSubmitting(true)
    try {
      const result = await submitFn(activeId, team.id, {
        project_title: form.project_title.trim(),
        problem_statement: form.problem_statement.trim(),
        theme: form.theme,
        description: form.description.trim(),
        ppt_url: form.ppt_url,
        ppt_file_name: form.ppt_file_name,
        stage: form.stage,
        repo_url: form.repo_url.trim(),
        demo_url: form.demo_url.trim(),
        video_url: form.video_url.trim(),
        tech_stack: splitTags(form.tech_stack),
      })
      if (!result) {
        setSubmitError('Something went wrong saving your submission. Please try again.')
        return
      }
      setEditing(false)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Submission failed with an exception', err)
      setSubmitError('Something went wrong saving your submission. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (existing && !editing) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-student">
            <Check size={15} /> Submitted ✓
          </div>
          {!ended && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white">
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold">{existing.project_title}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {existing.theme && <span className="rounded-full border border-student/30 bg-student-soft px-2.5 py-1 text-[11px] font-medium text-student">{existing.theme}</span>}
          {existing.stage && <span className="rounded-full border border-bg-border bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/50">{existing.stage}</span>}
        </div>
        {existing.problem_statement && (
          <div className="mt-3">
            <p className="text-xs font-medium text-white/40">Problem Statement</p>
            <p className="mt-1 text-sm leading-relaxed text-white/60">{existing.problem_statement}</p>
          </div>
        )}
        <div className="mt-3">
          <p className="text-xs font-medium text-white/40">Description</p>
          <p className="mt-1 text-sm leading-relaxed text-white/60">{existing.description}</p>
        </div>
        {existing.tech_stack?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {existing.tech_stack.map((t) => (
              <span key={t} className="rounded-full border border-bg-border px-2.5 py-1 text-[11px] text-white/50">{t}</span>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          {existing.ppt_url && (
            <a href={existing.ppt_url} download={existing.ppt_file_name || 'presentation.pptx'} className="flex items-center gap-1.5 text-white/45 hover:text-student">
              <FileIcon size={13} /> {existing.ppt_file_name || 'PPT'}
            </a>
          )}
          {existing.repo_url && (
            <a href={existing.repo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/45 hover:text-student">
              <Github size={13} /> Repo
            </a>
          )}
          {existing.demo_url && (
            <a href={existing.demo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/45 hover:text-student">
              <ExternalLink size={13} /> Live demo
            </a>
          )}
          {existing.video_url && (
            <a href={existing.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/45 hover:text-student">
              <Video size={13} /> Demo video
            </a>
          )}
        </div>
        {ended && <p className="mt-4 text-xs text-white/30">Submissions are locked — this opportunity has ended.</p>}
      </Card>
    )
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Rocket size={16} className="text-student" />
        <h3 className="font-display text-base font-semibold">{existing ? 'Edit your submission' : 'Submit your project'}</h3>
      </div>
      <form onSubmit={submit} className="space-y-4">
        {opportunity && (
          <p className="rounded-lg border border-bg-border bg-white/[0.02] px-3.5 py-2.5 text-xs text-white/45">
            Submitting for {activeType === 'hackathon' ? 'hackathon' : 'internship'}:{' '}
            <span className="text-white/70">{opportunity.title}</span>
          </p>
        )}
        <Field label="Project title" htmlFor="proj-title">
          <Input id="proj-title" value={form.project_title} onChange={(e) => setForm((f) => ({ ...f, project_title: e.target.value }))} required />
        </Field>

        <Field label="Problem Statement" htmlFor="proj-problem" hint="What problem are you solving, and for whom?">
          <Textarea id="proj-problem" value={form.problem_statement} onChange={(e) => setForm((f) => ({ ...f, problem_statement: e.target.value }))} required />
        </Field>

        <Field label="Theme" htmlFor="proj-theme">
          <Select id="proj-theme" value={form.theme} onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))} required>
            <option value="" disabled>Select a theme</option>
            {PROJECT_THEMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>

        <Field label="Description" htmlFor="proj-desc" hint="What does it do, what did you build, what's the impact?">
          <Textarea id="proj-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
        </Field>

        <Field label="Submit Your PPT" htmlFor="proj-ppt" hint="PPT under 2MB. Choosing a new file replaces the one currently attached.">
          <input ref={pptInputRef} id="proj-ppt" type="file" accept=".ppt,.pptx,.pdf" className="hidden" onChange={handlePptPick} />
          {pptError && <p className="mb-1.5 text-xs text-red-400">{pptError}</p>}
          {form.ppt_file_name ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-bg-border bg-white/[0.02] px-3.5 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm text-white/70">
                <FileIcon size={15} className="shrink-0 text-volunteer" />
                <span className="truncate">{form.ppt_file_name}</span>
              </span>
              <div className="flex shrink-0 gap-3 text-xs font-medium">
                <button type="button" onClick={() => pptInputRef.current?.click()} disabled={pptUploading} className="text-white/50 hover:text-white">
                  {pptUploading ? 'Uploading...' : 'Replace'}
                </button>
                <button type="button" onClick={removePpt} className="text-white/50 hover:text-red-400">
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={() => pptInputRef.current?.click()} disabled={pptUploading}>
              <Paperclip size={14} /> {pptUploading ? 'Uploading...' : 'Choose PPT file'}
            </Button>
          )}
        </Field>

        <Field label="Current stage of Project" htmlFor="proj-stage">
          <Select id="proj-stage" value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))} required>
            <option value="" disabled>Select current stage</option>
            {PROJECT_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>

        <div className="border-t border-bg-border pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-white/30">Optional links</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Repo URL" htmlFor="proj-repo">
              <Input id="proj-repo" value={form.repo_url} onChange={(e) => setForm((f) => ({ ...f, repo_url: e.target.value }))} placeholder="https://github.com/..." />
            </Field>
            <Field label="Demo URL" htmlFor="proj-demo">
              <Input id="proj-demo" value={form.demo_url} onChange={(e) => setForm((f) => ({ ...f, demo_url: e.target.value }))} placeholder="https://..." />
            </Field>
            <Field label="Video URL" htmlFor="proj-video">
              <Input id="proj-video" value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} placeholder="https://youtu.be/..." />
            </Field>
          </div>
          <Field label="Tech stack" htmlFor="proj-stack" hint="Comma-separated, e.g. React, Node.js, Postgres" className="mt-4">
            <Input id="proj-stack" value={form.tech_stack} onChange={(e) => setForm((f) => ({ ...f, tech_stack: e.target.value }))} placeholder="React, Node.js, Postgres" />
          </Field>
        </div>

        {submitError && <p className="text-xs text-red-400">{submitError}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : existing ? 'Save changes' : 'Submit Project'}
          </Button>
          {existing && (
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              <X size={14} /> Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}