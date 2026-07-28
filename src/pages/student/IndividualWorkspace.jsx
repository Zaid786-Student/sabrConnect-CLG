import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Rocket, Check, Pencil, X, Github, ExternalLink, Video, Lock } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Field, Textarea } from '../../components/ui/Input'
import NoticeList from '../../components/dashboard/NoticeList'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { splitTags } from '../../lib/utils'

export default function IndividualWorkspace() {
  const { id } = useParams()
  const { user } = useAuth()
  const { hackathons, getApplication, submitIndividualProject, getIndividualSubmission } = useData()

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

  // This workspace is only for solo registrants whose application has
  // actually been accepted — anyone else gets sent back with an explanation
  // rather than a confusing empty page.
  if (!application || application.team_id) {
    return (
      <DashboardShell role="student" title={hackathon.title} subtitle="Individual workspace">
        <Card className="text-center text-sm text-white/50">
          <Lock size={20} className="mx-auto mb-3 text-white/30" />
          <p>{application?.team_id ? 'You registered for this hackathon as a team — use your team workspace instead.' : "You haven't registered for this hackathon yet."}</p>
          <Button as={Link} to={`/dashboard/student/hackathons/${id}`} variant="outline" className="mt-4">
            <ArrowLeft size={15} /> Back to Hackathon
          </Button>
        </Card>
      </DashboardShell>
    )
  }

  if (application.status !== 'accepted') {
    return (
      <DashboardShell role="student" title={hackathon.title} subtitle="Individual workspace">
        <Card className="text-center text-sm text-white/50">
          <Lock size={20} className="mx-auto mb-3 text-white/30" />
          <p>
            {application.status === 'rejected'
              ? "Your registration wasn't accepted, so this workspace isn't available."
              : "Your registration is still waiting for organizer approval. You'll get access here as soon as it's accepted."}
          </p>
          <Button as={Link} to={`/dashboard/student/hackathons/${id}`} variant="outline" className="mt-4">
            <ArrowLeft size={15} /> Back to Hackathon
          </Button>
        </Card>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell role="student" title={hackathon.title} subtitle="Individual workspace">
      <Link to={`/dashboard/student/hackathons/${id}`} className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-white/40 hover:text-white">
        <ArrowLeft size={13} /> Back to Hackathon
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-4 font-display text-base font-semibold">Notices & Updates</h2>
            <NoticeList notices={hackathon.notices} accent="student" />
          </Card>
        </div>
        <div>
          <IndividualProjectPanel
            hackathonId={id}
            user={user}
            submitIndividualProject={submitIndividualProject}
            getIndividualSubmission={getIndividualSubmission}
            hackathonEnded={hackathon.end_date ? new Date(hackathon.end_date) < new Date() : false}
          />
        </div>
      </div>
    </DashboardShell>
  )
}

function IndividualProjectPanel({ hackathonId, user, submitIndividualProject, getIndividualSubmission, hackathonEnded }) {
  const existing = getIndividualSubmission(user?.id, hackathonId)
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
    submitIndividualProject(hackathonId, user?.id, user?.full_name, {
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
      <Card className="lg:sticky lg:top-24">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-student">
            <Check size={15} /> Submitted ✓
          </div>
          {!hackathonEnded && (
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
        {hackathonEnded && <p className="mt-4 text-xs text-white/30">Submissions are locked — this hackathon has ended.</p>}
      </Card>
    )
  }

  return (
    <Card className="lg:sticky lg:top-24">
      <div className="mb-4 flex items-center gap-2">
        <Rocket size={16} className="text-student" />
        <h3 className="font-display text-base font-semibold">{existing ? 'Edit your submission' : 'Submit your project'}</h3>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Project title" htmlFor="ind-title">
          <Input id="ind-title" value={form.project_title} onChange={(e) => setForm((f) => ({ ...f, project_title: e.target.value }))} required />
        </Field>
        <Field label="Description" htmlFor="ind-desc" hint="What does it do, what did you build, what's the impact?">
          <Textarea id="ind-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
        </Field>
        <Field label="Repo URL" htmlFor="ind-repo">
          <Input id="ind-repo" value={form.repo_url} onChange={(e) => setForm((f) => ({ ...f, repo_url: e.target.value }))} placeholder="https://github.com/..." />
        </Field>
        <Field label="Demo URL" htmlFor="ind-demo">
          <Input id="ind-demo" value={form.demo_url} onChange={(e) => setForm((f) => ({ ...f, demo_url: e.target.value }))} placeholder="https://..." />
        </Field>
        <Field label="Video URL" htmlFor="ind-video">
          <Input id="ind-video" value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} placeholder="https://youtu.be/..." />
        </Field>
        <Field label="Tech stack" htmlFor="ind-stack" hint="Comma-separated, e.g. React, Node.js, Postgres">
          <Input id="ind-stack" value={form.tech_stack} onChange={(e) => setForm((f) => ({ ...f, tech_stack: e.target.value }))} placeholder="React, Node.js, Postgres" />
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
