import { useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, X, Users2, ClipboardCheck, UserCog, Megaphone, Lock, Clock, ListChecks, ClipboardList } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card, StatCard } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input, { Textarea } from '../../components/ui/Input'
import NoticeList from '../../components/dashboard/NoticeList'
import JudgingTab from './Judging'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../lib/utils'

const appStatusVariant = { accepted: 'success', in_review: 'warning', submitted: 'info', rejected: 'neutral' }

export default function OrganizerEventDetail() {
  const { kind, id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    hackathons,
    internships,
    applications,
    volunteerSignups,
    volunteerTasks,
    teams,
    setApplicationStatus,
    setVolunteerSignupStatus,
    addHackathonNotice,
    addInternshipNotice,
    getSubmissionsForHackathon,
    getSubmissionsForInternship,
    setSubmissionStatus,
    setSubmissionOrganizerScore,
    setSubmissionAiScore,
    addVolunteerTask,
  } = useData()

  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview')
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '' })
  const [assigningId, setAssigningId] = useState(null)
  const [taskForm, setTaskForm] = useState({ title: '', deadline: '', priority: 'medium' })

  const isHackathon = kind === 'hackathon'
  const event = isHackathon ? hackathons.find((h) => h.id === id) : internships.find((i) => i.id === id)

  if (!event) {
    return (
      <DashboardShell role="organizer" title="Event not found" subtitle="This event may have been removed.">
        <Link to="/dashboard/organizer/events" className="text-sm text-white/50 hover:text-white">
          ← Back to Events
        </Link>
      </DashboardShell>
    )
  }

  const isOwn = event.organizer_id === user?.id

  if (!isOwn) {
    return (
      <DashboardShell role="organizer" title={event.title} subtitle="Access restricted">
        <Card className="flex flex-col items-center gap-3 py-14 text-center">
          <Lock className="text-white/30" size={28} />
          <p className="max-w-sm text-sm text-white/50">
            This event was created by {event.organizer_name}. Only the organizer who created it can view its
            participants, volunteers, and manage its environment.
          </p>
          <Button variant="outline" className="mt-2" onClick={() => navigate('/dashboard/organizer/events')}>
            Back to Events
          </Button>
        </Card>
      </DashboardShell>
    )
  }

  const eventApplications = applications.filter((a) => a.opportunity_id === event.id)
  const acceptedApplications = eventApplications.filter((a) => a.status === 'accepted')
  const acceptedParticipantCount = acceptedApplications.reduce((sum, a) => sum + (a.member_count || 1), 0)
  const eventSignups = isHackathon ? volunteerSignups.filter((s) => s.hackathon_id === event.id) : []
  const pendingSignups = eventSignups.filter((s) => s.status === 'pending')
  const acceptedSignups = eventSignups.filter((s) => s.status === 'accepted')
  const eventSubmissions = isHackathon ? getSubmissionsForHackathon(event.id) : getSubmissionsForInternship(event.id)

  const submitNotice = (e) => {
    e.preventDefault()
    if (!noticeForm.title.trim()) return
    if (isHackathon) addHackathonNotice(event.id, noticeForm)
    else addInternshipNotice(event.id, noticeForm)
    setNoticeForm({ title: '', content: '' })
  }

  const submitTask = (e, signup) => {
    e.preventDefault()
    if (!taskForm.title.trim()) return
    addVolunteerTask({
      volunteer_id: signup.volunteer_id,
      event_id: event.id,
      event_title: event.title,
      title: taskForm.title.trim(),
      deadline: taskForm.deadline || null,
      priority: taskForm.priority,
    })
    setTaskForm({ title: '', deadline: '', priority: 'medium' })
    setAssigningId(null)
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'participants', label: `Participants (${eventApplications.length})` },
    ...(isHackathon ? [{ key: 'volunteers', label: `Volunteers (${eventSignups.length})` }] : []),
    { key: 'judging', label: `Judging (${eventSubmissions.length})` },
    { key: 'notices', label: `Notices (${event.notices?.length || 0})` },
  ]

  return (
    <DashboardShell role="organizer" title={event.title} subtitle="Your event environment — visible only to you.">
      <button
        onClick={() => navigate('/dashboard/organizer/events')}
        className="mb-6 flex items-center gap-1.5 text-sm text-white/45 hover:text-white"
      >
        <ArrowLeft size={15} /> Back to Events
      </button>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key ? 'border-organizer/40 bg-organizer-soft text-organizer' : 'border-bg-border text-white/50 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Applications" value={eventApplications.length} icon={ClipboardCheck} accent="student" />
            <StatCard label="Accepted Participants" value={acceptedParticipantCount} icon={Users2} accent="organizer" />
            {isHackathon && (
              <>
                <StatCard label="Volunteer Requests" value={pendingSignups.length} icon={Clock} accent="volunteer" />
                <StatCard label="Approved Volunteers" value={acceptedSignups.length} icon={UserCog} accent="organizer" />
              </>
            )}
          </div>
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Badge variant={isHackathon ? 'organizer' : 'volunteer'} className="capitalize">
                {event.status || 'open'}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-white/60">{event.description}</p>
          </Card>
        </div>
      )}

      {tab === 'participants' && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-bg-border text-xs uppercase tracking-wide text-white/35">
                <th className="px-6 py-4 font-medium">Applicant</th>
                <th className="px-6 py-4 font-medium">Submitted</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {eventApplications.map((a) => (
                <tr key={a.id} className="border-b border-bg-border last:border-0 align-top">
                  <td className="px-6 py-4 font-medium">
                    {a.team_id ? (
                      <div>
                        <p className="flex items-center gap-1.5">
                          <Users2 size={13} className="text-organizer" /> {a.team_name || 'Team'}
                          <span className="font-normal text-white/40">· {a.member_count} member{a.member_count === 1 ? '' : 's'}</span>
                        </p>
                        <p className="mt-1 text-xs font-normal text-white/40">
                          {(a.members || []).map((m) => m.name).filter(Boolean).join(', ')}
                        </p>
                      </div>
                    ) : (
                      a.user_name || `Student #${(a.user_id || '').slice(-4)}`
                    )}
                  </td>
                  <td className="px-6 py-4 text-white/50">{formatDate(a.created_at)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={appStatusVariant[a.status]} className="capitalize">
                      {a.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {a.status === 'submitted' || a.status === 'in_review' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setApplicationStatus(a.id, 'accepted')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-student/30 bg-student-soft text-student hover:brightness-110"
                          aria-label="Accept"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setApplicationStatus(a.id, 'rejected')}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-bg-border text-white/40 hover:text-red-400"
                          aria-label="Reject"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <p className="text-right text-xs text-white/25">Decision final</p>
                    )}
                  </td>
                </tr>
              ))}
              {eventApplications.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-sm text-white/30">
                    No applications for this event yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'volunteers' && isHackathon && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 font-display text-base font-semibold">Awaiting Approval</h2>
            <div className="space-y-3">
              {pendingSignups.map((s) => (
                <Card key={s.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.volunteer_name || 'Volunteer'}</p>
                    <p className="text-xs text-white/40">Requested {formatDate(s.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setVolunteerSignupStatus(s.id, 'accepted')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-student/30 bg-student-soft text-student hover:brightness-110"
                      aria-label="Accept"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setVolunteerSignupStatus(s.id, 'rejected')}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-bg-border text-white/40 hover:text-red-400"
                      aria-label="Reject"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </Card>
              ))}
              {pendingSignups.length === 0 && (
                <p className="rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/25">
                  No pending volunteer requests.
                </p>
              )}
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-base font-semibold">Approved Volunteers</h2>
            <div className="space-y-3">
              {acceptedSignups.map((s) => {
                const myTasks = volunteerTasks.filter((t) => t.volunteer_id === s.volunteer_id && t.event_id === event.id)
                const isAssigning = assigningId === s.id
                return (
                  <Card key={s.id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium">{s.volunteer_name || 'Volunteer'}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Confirmed</Badge>
                        <button
                          onClick={() => {
                            setAssigningId(isAssigning ? null : s.id)
                            setTaskForm({ title: '', deadline: '', priority: 'medium' })
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-organizer/30 bg-organizer-soft px-3 py-1.5 text-xs font-medium text-organizer hover:brightness-110"
                        >
                          <ClipboardList size={13} /> {isAssigning ? 'Cancel' : 'Assign Task'}
                        </button>
                      </div>
                    </div>

                    {myTasks.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {myTasks.map((t) => (
                          <div key={t.id} className="flex items-center justify-between rounded-lg border border-bg-border bg-white/[0.02] px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-white/80">{t.title}</p>
                              {t.deadline && <p className="text-[11px] text-white/35">Due {formatDate(t.deadline)}</p>}
                            </div>
                            <Badge variant={{ pending: 'warning', in_progress: 'info', completed: 'success' }[t.status]}>
                              {t.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                    {myTasks.length === 0 && !isAssigning && (
                      <p className="mt-2 text-xs text-white/25">No tasks assigned yet.</p>
                    )}

                    {isAssigning && (
                      <form onSubmit={(e) => submitTask(e, s)} className="mt-4 space-y-3 border-t border-bg-border pt-4">
                        <Input
                          placeholder="Task title (e.g. Manage check-in desk)"
                          required
                          value={taskForm.title}
                          onChange={(ev) => setTaskForm((f) => ({ ...f, title: ev.target.value }))}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1.5 block text-xs text-white/40">Deadline</label>
                            <input
                              type="date"
                              value={taskForm.deadline}
                              onChange={(ev) => setTaskForm((f) => ({ ...f, deadline: ev.target.value }))}
                              className="w-full rounded-lg border border-bg-border bg-white/[0.02] px-3 py-2 text-sm text-white/80 focus:border-organizer/40 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs text-white/40">Priority</label>
                            <select
                              value={taskForm.priority}
                              onChange={(ev) => setTaskForm((f) => ({ ...f, priority: ev.target.value }))}
                              className="w-full rounded-lg border border-bg-border bg-white/[0.02] px-3 py-2 text-sm text-white/80 focus:border-organizer/40 focus:outline-none"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>
                        <Button type="submit" className="!py-2 text-xs">Assign Task to {s.volunteer_name || 'Volunteer'}</Button>
                      </form>
                    )}
                  </Card>
                )
              })}
              {acceptedSignups.length === 0 && (
                <p className="rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/25">
                  No approved volunteers yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'judging' && (
        <JudgingTab
          hackathon={event}
          submissions={eventSubmissions}
          teams={teams}
          applications={eventApplications}
          setSubmissionStatus={setSubmissionStatus}
          setSubmissionOrganizerScore={setSubmissionOrganizerScore}
          setSubmissionAiScore={setSubmissionAiScore}
        />
      )}

      {tab === 'notices' && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Megaphone size={16} className="text-organizer" />
              <h2 className="font-display text-base font-semibold">Post a Notice</h2>
            </div>
            <form onSubmit={submitNotice} className="space-y-3">
              <Input
                placeholder="Notice title"
                required
                value={noticeForm.title}
                onChange={(ev) => setNoticeForm((f) => ({ ...f, title: ev.target.value }))}
              />
              <Textarea
                placeholder="Details for students/volunteers"
                value={noticeForm.content}
                onChange={(ev) => setNoticeForm((f) => ({ ...f, content: ev.target.value }))}
              />
              <Button type="submit" className="!py-2 text-xs">Post Notice</Button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-4 font-display text-base font-semibold">Past Notices</h2>
            <NoticeList notices={event.notices} accent="organizer" />
          </Card>
        </div>
      )}
    </DashboardShell>
  )
}
