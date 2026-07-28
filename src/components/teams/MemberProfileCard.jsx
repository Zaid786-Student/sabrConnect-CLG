import { useState } from 'react'
import { Crown, Github, Globe, Pencil, X, Check } from 'lucide-react'
import { Card } from '../ui/Card'
import Button from '../ui/Button'
import Input, { Field, Textarea, Select } from '../ui/Input'
import { AVAILABILITY_STATUSES, EXPERIENCE_LEVELS, availabilityTone, experienceTone, splitTags } from '../../lib/utils'

export default function MemberProfileCard({ member, isSelf, isLeader, canManage, onSave, onMakeLeader }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    bio: member.bio || '',
    experience: member.experience || 'Beginner',
    projects: (member.projects || []).join(', '),
    portfolioUrl: member.portfolioUrl || '',
    githubUrl: member.githubUrl || '',
    availability: member.availability || 'Available',
  })

  const submit = (e) => {
    e.preventDefault()
    onSave({
      bio: form.bio,
      experience: form.experience,
      projects: splitTags(form.projects),
      portfolioUrl: form.portfolioUrl,
      githubUrl: form.githubUrl,
      availability: form.availability,
    })
    setEditing(false)
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-student-soft text-sm font-semibold text-student">
            {member.name?.[0]}
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white/90">
              {member.name} {member.isLeader && <Crown size={13} className="shrink-0 text-organizer" />}
            </p>
            <p className="text-xs text-white/40">{member.role}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`badge ${availabilityTone(member.availability)}`}>{member.availability || 'Available'}</span>
          {isSelf && !editing && (
            <button onClick={() => setEditing(true)} className="text-white/40 hover:text-white" aria-label="Edit your profile">
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <form onSubmit={submit} className="space-y-3 rounded-xl border border-bg-border bg-white/[0.02] p-3.5">
          <Field label="Bio" htmlFor={`bio-${member.id}`}>
            <Textarea id={`bio-${member.id}`} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="A couple sentences about you" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Experience level" htmlFor={`exp-${member.id}`}>
              <Select id={`exp-${member.id}`} value={form.experience} onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}>
                {EXPERIENCE_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Availability" htmlFor={`avail-${member.id}`}>
              <Select id={`avail-${member.id}`} value={form.availability} onChange={(e) => setForm((f) => ({ ...f, availability: e.target.value }))}>
                {AVAILABILITY_STATUSES.map((a) => <option key={a}>{a}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Projects" htmlFor={`proj-${member.id}`} hint="Comma-separated">
            <Input id={`proj-${member.id}`} value={form.projects} onChange={(e) => setForm((f) => ({ ...f, projects: e.target.value }))} placeholder="CivicPing, AttendEase..." />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Portfolio link" htmlFor={`pf-${member.id}`}>
              <Input id={`pf-${member.id}`} value={form.portfolioUrl} onChange={(e) => setForm((f) => ({ ...f, portfolioUrl: e.target.value }))} placeholder="https://..." />
            </Field>
            <Field label="GitHub link" htmlFor={`gh-${member.id}`}>
              <Input id={`gh-${member.id}`} value={form.githubUrl} onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))} placeholder="https://github.com/..." />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1"><Check size={14} /> Save</Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}><X size={14} /> Cancel</Button>
          </div>
        </form>
      ) : (
        <>
          {member.bio && <p className="text-sm text-white/55">{member.bio}</p>}

          <div className="flex flex-wrap items-center gap-1.5">
            {member.experience && <span className={`badge ${experienceTone(member.experience)}`}>{member.experience}</span>}
            {(member.skills || []).map((s) => (
              <span key={s} className="rounded-full border border-bg-border px-2.5 py-1 text-xs text-white/45">{s}</span>
            ))}
          </div>

          {member.projects?.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-white/30">Projects</p>
              <p className="text-xs text-white/55">{member.projects.join(' · ')}</p>
            </div>
          )}

          {(member.portfolioUrl || member.githubUrl) && (
            <div className="flex flex-wrap gap-3 pt-1 text-xs">
              {member.portfolioUrl && (
                <a href={member.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-volunteer hover:underline">
                  <Globe size={12} /> Portfolio
                </a>
              )}
              {member.githubUrl && (
                <a href={member.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-white/50 hover:text-white">
                  <Github size={12} /> GitHub
                </a>
              )}
            </div>
          )}

          {canManage && !member.isLeader && (
            <button
              onClick={onMakeLeader}
              className="mt-1 flex w-fit items-center gap-1.5 rounded-lg border border-organizer/30 bg-organizer-soft px-3 py-1.5 text-xs font-medium text-organizer hover:bg-organizer/20"
            >
              <Crown size={13} /> Make {member.name?.split(' ')[0]} Team Leader
            </button>
          )}
        </>
      )}
    </Card>
  )
}
