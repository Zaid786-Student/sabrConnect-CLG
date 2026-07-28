import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Wallet, MapPin, Clock, CheckCircle2, Rocket, Check, Pencil, X, Github, ExternalLink, Video } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Field, Textarea } from '../../components/ui/Input'
import NoticeList from '../../components/dashboard/NoticeList'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, splitTags } from '../../lib/utils'

export default function InternshipWorkspace() {
  const { id } = useParams()
  const { user } = useAuth()
  const { internships, getApplication, submitIndividualInternshipProject, getIndividualInternshipSubmission } = useData()

  const internship = internships.find((i) => i.id === id)
  const application = getApplication(user?.id, id)

  if (!internship) {
    return (
      <DashboardShell role="student" title="Internship not found" subtitle="This role may have been removed.">
        <Link to="/dashboard/student/internships" className="text-sm text-white/50 hover:text-white">
          ← Back to Internships
        </Link>
      </DashboardShell>
    )
  }

  // Same guard pattern as the hackathon workspace: only an accepted solo
  // applicant gets in here — a team applicant or anyone not yet accepted
  // is sent back with a short explanation instead of an empty page.
  if (!application || application.team_id) {
    return (
      <DashboardShell role="student" title={internship.title} subtitle="Individual workspace">
        <Card className="text-center text-sm text-white/50">
          <Lock size={20} className="mx-auto mb-3 text-white/30" />
          <p>{application?.team_id ? 'You applied for this internship as a team — use your team workspace instead.' : "You haven't applied for this internship yet."}</p>
          <Button as={Link} to={`/dashboard/student/internships/${id}`} variant="outline" className="mt-4">
            <ArrowLeft size={15} /> Back to Internship
          </Button>
        </Card>
      </DashboardShell>
    )
  }

  if (application.status !== 'accepted') {
    return (
      <DashboardShell role="student" title={internship.title} subtitle="Individual workspace">
        <Card className="text-center text-sm text-white/50">
          <Lock size={20} className="mx-auto mb-3 text-white/30" />
          <p>
            {application.status === 'rejected'
              ? "Your application wasn't accepted, so this workspace isn't available."
              : "Your application is still waiting for organizer approval. You'll get access here as soon as it's accepted."}
          </p>
          <Button as={Link} to={`/dashboard/student/internships/${id}`} variant="outline" className="mt-4">
            <ArrowLeft size={15} /> Back to Internship
          </Button>
        </Card>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell role="student" title={internship.title} subtitle="Individual workspace">
      <Link to={`/dashboard/student/internships/${id}`} className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white">
        <ArrowLeft size={13} /> Back to Internship
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 font-display text-base font-semibold">Notices & Updates</h2>
            <NoticeList notices={internship.notices} accent="student" />
          </Card>
          <InternshipProjectPanel
            internshipId={id}
            user={user}
            submitIndividualInternshipProject={submitIndividualInternshipProject}
            getIndividualInternshipSubmission={getIndividualInternshipSubmission}
            internshipEnded={internship.deadline ? new Date(internship.deadline) < new Date() : false}
          />
        </div>
        <div>
          <Card className="lg:sticky lg:top-24">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-student">
              <CheckCircle2 size={16} /> You're in!
            </div>
            <h3 className="font-display text-lg font-semibold">{internship.title}</h3>
            <p className="mt-1 text-sm text-white/50">{internship.company}</p>
            <div className="mt-4 space-y-2 text-xs text-white/50">
              {internship.location && (
                <p className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-student" /> {internship.location}
                </p>
              )}
              {internship.stipend && (
                <p className="flex items-center gap-1.5">
                  <Wallet size={13} className="text-student" /> {internship.stipend}
                </p>
              )}
              {internship.duration && (
                <p className="flex items-center gap-1.5">
                  <Clock size={13} className="text-student" /> {internship.duration}
                </p>
              )}
            </div>
            <p className="mt-4 text-xs text-white/35">Accepted {formatDate(application.created_at)}</p>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}

function InternshipProjectPanel({ internshipId, user, submitIndividualInternshipProject, getIndividualInternshipSubmission, internshipEnded }) {
  const existing = getIndividualInternshipSubmission(user?.id, internshipId)
  const [editing, setEditing] = useState(!existing)
  const [form, setForm] = useState({
    project_title: existing?.project_title || '',
    description: existing?.description || '',
    repo_url: existing?.repo_url || '',
    demo_url: existing?.demo_url || '',
    video_url: existing?.video_url || '',
    tech_stack: (existing?.tech_stack || []).join(', '),
  })

  const submit = (e) => {
    e.preventDefault()
    if (!form.project_title.trim() || !form.description.trim()) return
    submitIndividualInternshipProject(internshipId, user?.id, user?.full_name, {
      project_title: form.project_title.trim(),
      description: form.description.trim(),
      repo_url: form.repo_url.trim(),
      demo_url: form.demo_url.trim(),
      video_url: form.video_url.trim(),
      tech_stack: splitTags(form.tech_stack),
    })
    setEditing(false)
  }

  if (existing && !editing) {
    return (
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-student">
            <Check size={15} /> Submitted ✓
          </div>
          {!internshipEnded && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white">
              <Pencil size={13} /> Edit
            </button>
          )}
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold">{existing.project_title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{existing.description}</p>
        {existing.tech_stack?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {existing.tech_stack.map((t) => (
              <span key={t} className="rounded-full border border-bg-border px-2.5 py-1 text-[11px] text-white/50">{t}</span>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
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
        {internshipEnded && <p className="mt-4 text-xs text-white/30">Submissions are locked — this internship's deadline has passed.</p>}
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
        <Field label="Project title" htmlFor="int-title">
          <Input id="int-title" value={form.project_title} onChange={(e) => setForm((f) => ({ ...f, project_title: e.target.value }))} required />
        </Field>
        <Field label="Description" htmlFor="int-desc" hint="What did you work on during this internship?">
          <Textarea id="int-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
        </Field>
        <Field label="Repo URL" htmlFor="int-repo">
          <Input id="int-repo" value={form.repo_url} onChange={(e) => setForm((f) => ({ ...f, repo_url: e.target.value }))} placeholder="https://github.com/..." />
        </Field>
        <Field label="Demo URL" htmlFor="int-demo">
          <Input id="int-demo" value={form.demo_url} onChange={(e) => setForm((f) => ({ ...f, demo_url: e.target.value }))} placeholder="https://..." />
        </Field>
        <Field label="Video URL" htmlFor="int-video">
          <Input id="int-video" value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} placeholder="https://youtu.be/..." />
        </Field>
        <Field label="Tech stack" htmlFor="int-stack" hint="Comma-separated, e.g. React, Node.js, Postgres">
          <Input id="int-stack" value={form.tech_stack} onChange={(e) => setForm((f) => ({ ...f, tech_stack: e.target.value }))} placeholder="React, Node.js, Postgres" />
        </Field>
        <div className="flex gap-2">
          <Button type="submit">{existing ? 'Save changes' : 'Submit Project'}</Button>
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
