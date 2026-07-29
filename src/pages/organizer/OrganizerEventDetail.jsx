import { useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, X, Users2, ClipboardCheck, Megaphone, Lock } from 'lucide-react'
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
    teams,
    setApplicationStatus,
    addHackathonNotice,
    addInternshipNotice,
    getSubmissionsForHackathon,
    getSubmissionsForInternship,
    setSubmissionStatus,
    setSubmissionOrganizerScore,
    setSubmissionAiScore,
  } = useData()

  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview')
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '' })

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
            participants and manage its environment.
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
  const eventSubmissions = isHackathon ? getSubmissionsForHackathon(event.id) : getSubmissionsForInternship(event.id)

  const submitNotice = (e) => {
    e.preventDefault()
    if (!noticeForm.title.trim()) return
    if (isHackathon) addHackathonNotice(event.id, noticeForm)
    else addInternshipNotice(event.id, noticeForm)
    setNoticeForm({ title: '', content: '' })
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'participants', label: `Participants (${eventApplications.length})` },
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
          </div>
          <Card>
            {event.thumbnail_url && (
              <img src={event.thumbnail_url} alt="" className="-mx-6 -mt-6 mb-4 h-44 w-[calc(100%+3rem)] rounded-t-2xl object-cover" />
            )}
            <div className="mb-3 flex items-center gap-2">
              <Badge variant={isHackathon ? 'organizer' : 'volunteer'} className="capitalize">
                {event.status || 'open'}
              </Badge>
            </div>
            <p className="text-sm leading-relaxed text-white/60">{event.description}</p>
            {isHackathon && (event.team_size || event.min_female_members) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {event.team_size && (
                  <span className="flex items-center gap-1.5 rounded-full border border-bg-border px-2.5 py-1 text-xs text-white/45">
                    <Users2 size={12} /> {event.team_size} members / team
                  </span>
                )}
                {!!event.min_female_members && (
                  <span className="rounded-full border border-bg-border px-2.5 py-1 text-xs text-white/45">
                    Min {event.min_female_members} female / team
                  </span>
                )}
              </div>
            )}
            {isHackathon && event.community_links?.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-white/50">Community links shown to registered students</p>
                <div className="flex flex-wrap gap-1.5">
                  {event.community_links.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-bg-border px-2.5 py-1 text-xs text-white/60 hover:border-organizer/40 hover:text-organizer"
                    >
                      {link.label || 'Link'}
                    </a>
                  ))}
                </div>
              </div>
            )}
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
