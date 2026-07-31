import { useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Check, X, Users2, ClipboardCheck, Megaphone, Lock, Eye, XCircle, Download, Pencil } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card, StatCard } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input, { Field, Textarea } from '../../components/ui/Input'
import NoticeList from '../../components/dashboard/NoticeList'
import JudgingTab from './Judging'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, splitTags } from '../../lib/utils'

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
    updateHackathon,
    updateInternship,
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
  const [detailsFor, setDetailsFor] = useState(null) // application whose full team details modal is open
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

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

  const openEdit = () => {
    setEditError('')
    if (isHackathon) {
      setEditForm({
        title: event.title || '',
        description: event.description || '',
        start_date: event.start_date || '',
        end_date: event.end_date || '',
        registration_deadline: event.registration_deadline || '',
        location: event.location || '',
        prize: event.prize || '',
        rules: event.rules || '',
        tags: (event.tags || []).join(', '),
        team_size: event.team_size ?? '',
        min_female_members: event.min_female_members ?? '',
      })
    } else {
      setEditForm({
        title: event.title || '',
        company: event.company || '',
        description: event.description || '',
        deadline: event.deadline || '',
        location: event.location || '',
        stipend: event.stipend || '',
        duration: event.duration || '',
        responsibilities: event.responsibilities || '',
        requirements: event.requirements || '',
      })
    }
    setEditing(true)
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    if (!editForm.title.trim()) {
      setEditError('Title is required.')
      return
    }
    setEditSaving(true)
    setEditError('')
    const updates = isHackathon
      ? {
          ...editForm,
          tags: splitTags(editForm.tags),
          team_size: editForm.team_size !== '' ? Number(editForm.team_size) : null,
          min_female_members: editForm.min_female_members !== '' ? Number(editForm.min_female_members) : null,
        }
      : { ...editForm }
    const result = isHackathon ? await updateHackathon(event.id, updates) : await updateInternship(event.id, updates)
    setEditSaving(false)
    if (!result?.success) {
      setEditError(result?.error || 'Something went wrong saving your changes — please try again.')
      return
    }
    setEditing(false)
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'participants', label: `Participants (${eventApplications.length})` },
    { key: 'details', label: 'Details' },
    { key: 'judging', label: `Judging (${eventSubmissions.length})` },
    { key: 'notices', label: `Notices (${event.notices?.length || 0})` },
  ]

  // Shared by the Participants "Details" modal, the Details tab, and the PDF
  // export — one team/applicant's member roster, leader always listed
  // first, pulled from the live team record so profiles are always current.
  const membersFor = (application) => {
    const team = application.team_id ? teams.find((t) => t.id === application.team_id) : null
    const members = team
      ? [...team.members].sort((x, y) => (y.isLeader ? 1 : 0) - (x.isLeader ? 1 : 0))
      : [{
          id: application.user_id,
          name: application.user_name,
          email: application.user_email,
          contact: '',
          role: '',
          skills: [],
          isLeader: true,
        }]
    return { team, members }
  }

  const downloadParticipantsPdf = () => {
    const doc = new jsPDF()
    const marginX = 14
    let cursorY = 20

    doc.setFontSize(16)
    doc.text(event.title || 'Event', marginX, cursorY)
    cursorY += 6
    doc.setFontSize(10)
    doc.setTextColor(130)
    doc.text(
      `${isHackathon ? 'Hackathon' : 'Internship'} · ${eventApplications.length} application${eventApplications.length === 1 ? '' : 's'} · Generated ${new Date().toLocaleDateString()}`,
      marginX,
      cursorY,
    )
    doc.setTextColor(0)
    cursorY += 8

    if (eventApplications.length === 0) {
      doc.setFontSize(11)
      doc.text('No applications for this event yet.', marginX, cursorY)
    }

    eventApplications.forEach((a) => {
      const { team, members } = membersFor(a)

      if (cursorY > 260) {
        doc.addPage()
        cursorY = 20
      }

      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text(a.team_id ? a.team_name || 'Team' : a.user_name || 'Applicant', marginX, cursorY)
      doc.setFont(undefined, 'normal')
      cursorY += 5
      doc.setFontSize(9)
      doc.setTextColor(130)
      doc.text(`Status: ${a.status.replace('_', ' ')}`, marginX, cursorY)
      doc.setTextColor(0)
      cursorY += 3

      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginX, right: marginX },
        head: [['Member', 'Name', 'Email', 'Contact', 'Role / Skills']],
        body: members.map((m, i) => [
          team ? `Member ${i + 1}${m.isLeader ? ' (Leader)' : ''}` : 'Applicant',
          m.name || '—',
          m.email || '—',
          m.contact || '—',
          [m.role, ...(m.skills?.length ? [m.skills.join(', ')] : [])].filter(Boolean).join(' · ') || '—',
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 30, 35] },
        theme: 'grid',
      })

      cursorY = doc.lastAutoTable.finalY + 10
    })

    const safeTitle = (event.title || 'event').replace(/[^a-z0-9]+/gi, '_').toLowerCase()
    doc.save(`${safeTitle}_participants.pdf`)
  }

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
            <div className="mb-3 flex items-center justify-between gap-2">
              <Badge variant={isHackathon ? 'organizer' : 'volunteer'} className="capitalize">
                {event.status || 'open'}
              </Badge>
              <Button variant="outline" className="text-xs" onClick={openEdit}>
                <Pencil size={13} /> Edit
              </Button>
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
                        </p>
                        <p className="mt-1 text-xs font-normal text-white/40">
                          Leader: {a.user_name || 'Unknown'}
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDetailsFor(a)}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-bg-border px-3 text-xs font-medium text-white/60 hover:border-white/30 hover:text-white"
                      >
                        <Eye size={13} /> Details
                      </button>
                      {a.status === 'submitted' || a.status === 'in_review' ? (
                        <>
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
                        </>
                      ) : (
                        <p className="text-xs text-white/25">Decision final</p>
                      )}
                    </div>
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

      {tab === 'details' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-white/40">
              Full roster for every application to this event — {eventApplications.length} total.
            </p>
            <Button variant="outline" className="text-xs" onClick={downloadParticipantsPdf}>
              <Download size={14} /> Download as PDF
            </Button>
          </div>

          {eventApplications.map((a) => {
            const { team, members } = membersFor(a)
            return (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold">
                    {a.team_id ? a.team_name || 'Team' : a.user_name || 'Applicant'}
                  </h3>
                  <Badge variant={appStatusVariant[a.status]} className="capitalize">
                    {a.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <MembersTable team={team} members={members} />
                </div>
              </Card>
            )
          })}

          {eventApplications.length === 0 && (
            <Card className="text-center text-sm text-white/30">No applications for this event yet.</Card>
          )}
        </div>
      )}

      {editing && editForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !editSaving && setEditing(false)}
        >
          <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <Card className="relative max-h-[85vh] overflow-y-auto">
              <button
                className="absolute right-4 top-4 text-white/40 hover:text-white"
                onClick={() => setEditing(false)}
                aria-label="Close"
                disabled={editSaving}
              >
                <XCircle size={20} />
              </button>

              <h2 className="pr-8 font-display text-lg font-semibold">Edit {isHackathon ? 'Hackathon' : 'Internship'}</h2>
              <p className="mt-1 text-xs text-white/40">Changes are visible to students as soon as you save.</p>

              <form onSubmit={submitEdit} className="mt-5 space-y-4">
                <Field label="Title" htmlFor="edit-title">
                  <Input
                    id="edit-title"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </Field>

                {!isHackathon && (
                  <Field label="Company" htmlFor="edit-company">
                    <Input
                      id="edit-company"
                      value={editForm.company}
                      onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))}
                    />
                  </Field>
                )}

                <Field label="Description" htmlFor="edit-description">
                  <Textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </Field>

                {isHackathon && (
                  <Field label="Rules" htmlFor="edit-rules">
                    <Textarea
                      id="edit-rules"
                      value={editForm.rules}
                      onChange={(e) => setEditForm((f) => ({ ...f, rules: e.target.value }))}
                    />
                  </Field>
                )}

                {isHackathon ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Start date" htmlFor="edit-start">
                      <Input
                        id="edit-start"
                        type="date"
                        value={editForm.start_date}
                        onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value }))}
                      />
                    </Field>
                    <Field label="End date" htmlFor="edit-end">
                      <Input
                        id="edit-end"
                        type="date"
                        value={editForm.end_date}
                        onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))}
                      />
                    </Field>
                    <Field label="Registration deadline" htmlFor="edit-reg-deadline">
                      <Input
                        id="edit-reg-deadline"
                        type="date"
                        value={editForm.registration_deadline}
                        onChange={(e) => setEditForm((f) => ({ ...f, registration_deadline: e.target.value }))}
                      />
                    </Field>
                  </div>
                ) : (
                  <Field label="Application deadline" htmlFor="edit-deadline">
                    <Input
                      id="edit-deadline"
                      type="date"
                      value={editForm.deadline}
                      onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
                    />
                  </Field>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Location" htmlFor="edit-location">
                    <Input
                      id="edit-location"
                      placeholder="Remote / City, IN"
                      value={editForm.location}
                      onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    />
                  </Field>
                  {isHackathon ? (
                    <Field label="Prize" htmlFor="edit-prize">
                      <Input
                        id="edit-prize"
                        placeholder="₹1,00,000 prize pool"
                        value={editForm.prize}
                        onChange={(e) => setEditForm((f) => ({ ...f, prize: e.target.value }))}
                      />
                    </Field>
                  ) : (
                    <Field label="Stipend" htmlFor="edit-stipend">
                      <Input
                        id="edit-stipend"
                        value={editForm.stipend}
                        onChange={(e) => setEditForm((f) => ({ ...f, stipend: e.target.value }))}
                      />
                    </Field>
                  )}
                </div>

                {isHackathon ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Team size" htmlFor="edit-team-size">
                      <Input
                        id="edit-team-size"
                        type="number"
                        min="1"
                        value={editForm.team_size}
                        onChange={(e) => setEditForm((f) => ({ ...f, team_size: e.target.value }))}
                      />
                    </Field>
                    <Field label="Min female members" htmlFor="edit-min-female">
                      <Input
                        id="edit-min-female"
                        type="number"
                        min="0"
                        value={editForm.min_female_members}
                        onChange={(e) => setEditForm((f) => ({ ...f, min_female_members: e.target.value }))}
                      />
                    </Field>
                    <Field label="Tags" htmlFor="edit-tags" hint="Comma-separated">
                      <Input
                        id="edit-tags"
                        value={editForm.tags}
                        onChange={(e) => setEditForm((f) => ({ ...f, tags: e.target.value }))}
                      />
                    </Field>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Duration" htmlFor="edit-duration">
                      <Input
                        id="edit-duration"
                        value={editForm.duration}
                        onChange={(e) => setEditForm((f) => ({ ...f, duration: e.target.value }))}
                      />
                    </Field>
                  </div>
                )}

                {!isHackathon && (
                  <>
                    <Field label="Responsibilities" htmlFor="edit-responsibilities">
                      <Textarea
                        id="edit-responsibilities"
                        value={editForm.responsibilities}
                        onChange={(e) => setEditForm((f) => ({ ...f, responsibilities: e.target.value }))}
                      />
                    </Field>
                    <Field label="Requirements" htmlFor="edit-requirements">
                      <Textarea
                        id="edit-requirements"
                        value={editForm.requirements}
                        onChange={(e) => setEditForm((f) => ({ ...f, requirements: e.target.value }))}
                      />
                    </Field>
                  </>
                )}

                {editError && <p className="text-sm text-red-400">{editError}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={editSaving}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={editSaving}>
                    {editSaving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      {detailsFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDetailsFor(null)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <Card className="relative max-h-[85vh] overflow-y-auto">
              <button
                className="absolute right-4 top-4 text-white/40 hover:text-white"
                onClick={() => setDetailsFor(null)}
                aria-label="Close"
              >
                <XCircle size={20} />
              </button>
              {(() => {
                const { team, members } = membersFor(detailsFor)

                return (
                  <>
                    <h2 className="pr-8 font-display text-lg font-semibold">
                      {detailsFor.team_id ? detailsFor.team_name || 'Team' : detailsFor.user_name || 'Applicant'}
                    </h2>
                    <p className="mt-1 text-xs text-white/40">{detailsFor.title}</p>

                    <div className="mt-5 overflow-x-auto">
                      <MembersTable team={team} members={members} />
                    </div>

                    {!team && detailsFor.team_id && (
                      <p className="mt-4 text-xs text-white/30">
                        This team's full member profiles are no longer available.
                      </p>
                    )}
                  </>
                )
              })()}
            </Card>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}

// Renders one applicant/team's member roster — shared by the Participants
// "Details" modal and the Details tab so the two never drift apart.
function MembersTable({ team, members }) {
  return (
    <table className="w-full min-w-[560px] text-left text-sm">
      <thead>
        <tr className="border-b border-bg-border text-xs uppercase tracking-wide text-white/35">
          <th className="py-2.5 pr-4 font-medium">Member</th>
          <th className="py-2.5 pr-4 font-medium">Name</th>
          <th className="py-2.5 pr-4 font-medium">Email</th>
          <th className="py-2.5 pr-4 font-medium">Contact</th>
          <th className="py-2.5 font-medium">Role / Skills</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m, i) => (
          <tr key={m.id || i} className="border-b border-bg-border last:border-0 align-top">
            <td className="py-3 pr-4 whitespace-nowrap text-white/50">
              {team ? `Member ${i + 1}${m.isLeader ? ' (Leader)' : ''}` : 'Applicant'}
            </td>
            <td className="py-3 pr-4 font-medium">{m.name || '—'}</td>
            <td className="py-3 pr-4 text-white/60">{m.email || '—'}</td>
            <td className="py-3 pr-4 text-white/60">{m.contact || '—'}</td>
            <td className="py-3 text-white/60">
              {[m.role, ...(m.skills?.length ? [m.skills.join(', ')] : [])].filter(Boolean).join(' · ') || '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
