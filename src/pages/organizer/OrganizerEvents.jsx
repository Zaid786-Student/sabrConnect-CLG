import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X, Users2, CalendarDays, MapPin, Wallet, Megaphone, Lock, ArrowUpRight, Image as ImageIcon, Link2, Trash2 } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input, { Field, Textarea } from '../../components/ui/Input'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate, splitTags, fileToDataUrl, TEAM_CAPACITY } from '../../lib/utils'

const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024 // 2MB — demo-safe size for data-url thumbnails

const emptyHackForm = {
  title: '', description: '', start_date: '', end_date: '', registration_deadline: '', location: '', prize: '', rules: '', tags: '',
  thumbnail_url: '', team_size: '', min_female_members: '', community_links: [{ label: 'WhatsApp', url: '' }],
}
const emptyIntForm = { title: '', company: '', description: '', deadline: '', location: '', stipend: '', duration: '', responsibilities: '', requirements: '', thumbnail_url: '' }

export default function OrganizerEvents() {
  const { user } = useAuth()
  const { hackathons, internships, addHackathon, addInternship, addHackathonNotice, addInternshipNotice } = useData()
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState('hackathon')
  const [hackForm, setHackForm] = useState(emptyHackForm)
  const [intForm, setIntForm] = useState(emptyIntForm)
  const [noticeFor, setNoticeFor] = useState(null) // { kind, id }
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '' })

  const [publishError, setPublishError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [thumbError, setThumbError] = useState('')
  const [thumbUploading, setThumbUploading] = useState(false)
  const hackThumbInputRef = useRef(null)
  const intThumbInputRef = useRef(null)

  const pickThumbnail = async (e, setForm) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setThumbError('')
    if (!file.type.startsWith('image/')) {
      setThumbError('Please choose an image file for the thumbnail.')
      return
    }
    if (file.size > MAX_THUMBNAIL_BYTES) {
      setThumbError('Thumbnail is too large — please use an image under 2MB.')
      return
    }
    setThumbUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      setForm((f) => ({ ...f, thumbnail_url: dataUrl }))
    } finally {
      setThumbUploading(false)
    }
  }

  const updateCommunityLink = (index, key, value) => {
    setHackForm((f) => ({
      ...f,
      community_links: f.community_links.map((link, i) => (i === index ? { ...link, [key]: value } : link)),
    }))
  }

  const addCommunityLinkRow = () => {
    setHackForm((f) => ({ ...f, community_links: [...f.community_links, { label: '', url: '' }] }))
  }

  const removeCommunityLinkRow = (index) => {
    setHackForm((f) => ({ ...f, community_links: f.community_links.filter((_, i) => i !== index) }))
  }

  const createHackathon = async (e) => {
    e.preventDefault()
    if (!hackForm.title.trim()) return
    setPublishError('')
    setPublishing(true)
    const result = await addHackathon(
      {
        ...hackForm,
        tags: splitTags(hackForm.tags),
        team_size: hackForm.team_size !== '' ? Number(hackForm.team_size) : null,
        min_female_members: hackForm.min_female_members !== '' ? Number(hackForm.min_female_members) : null,
        community_links: hackForm.community_links
          .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
          .filter((link) => link.url),
      },
      user,
    )
    setPublishing(false)
    if (!result?.success) {
      setPublishError(result?.error || 'Something went wrong publishing this hackathon. Please try again.')
      return
    }
    setHackForm(emptyHackForm)
    setShowForm(false)
  }

  const createInternship = async (e) => {
    e.preventDefault()
    if (!intForm.title.trim()) return
    setPublishError('')
    setPublishing(true)
    const result = await addInternship({ ...intForm, company: intForm.company || user?.full_name }, user)
    setPublishing(false)
    if (!result?.success) {
      setPublishError(result?.error || 'Something went wrong publishing this internship. Please try again.')
      return
    }
    setIntForm(emptyIntForm)
    setShowForm(false)
  }

  const submitNotice = (e) => {
    e.preventDefault()
    if (!noticeForm.title.trim() || !noticeFor) return
    if (noticeFor.kind === 'hackathon') addHackathonNotice(noticeFor.id, noticeForm)
    else addInternshipNotice(noticeFor.id, noticeForm)
    setNoticeForm({ title: '', content: '' })
    setNoticeFor(null)
  }

  const combined = [
    ...hackathons.map((h) => ({ ...h, kind: 'hackathon' })),
    ...internships.map((i) => ({ ...i, kind: 'internship', start_date: i.deadline })),
  ]
    .map((e) => ({ ...e, isOwn: e.organizer_id === user?.id }))
    .sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0))

  return (
    <DashboardShell
      role="organizer"
      title="Events"
      subtitle="Browse everything published on SabrConnect — you can only manage the events you created."
    >
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Cancel' : 'Publish New'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <div className="mb-5 flex gap-2">
            <button
              onClick={() => setType('hackathon')}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium ${type === 'hackathon' ? 'border-organizer/40 bg-organizer-soft text-organizer' : 'border-bg-border text-white/50'}`}
            >
              Hackathon
            </button>
            <button
              onClick={() => setType('internship')}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium ${type === 'internship' ? 'border-organizer/40 bg-organizer-soft text-organizer' : 'border-bg-border text-white/50'}`}
            >
              Internship
            </button>
          </div>

          {type === 'hackathon' ? (
            <form onSubmit={createHackathon} className="grid gap-4 sm:grid-cols-2">
              <Field label="Thumbnail" htmlFor="hack-thumb" className="sm:col-span-2" hint="Shown on hackathon cards and the overview feed. Image under 2MB.">
                <input ref={hackThumbInputRef} id="hack-thumb" type="file" accept="image/*" className="hidden" onChange={(e) => pickThumbnail(e, setHackForm)} />
                <div className="flex items-center gap-3">
                  {hackForm.thumbnail_url ? (
                    <img src={hackForm.thumbnail_url} alt="" className="h-16 w-28 shrink-0 rounded-lg border border-bg-border object-cover" />
                  ) : (
                    <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-bg-border text-white/25">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Button type="button" variant="outline" className="!py-1.5 text-xs" onClick={() => hackThumbInputRef.current?.click()} disabled={thumbUploading}>
                      {thumbUploading ? 'Uploading…' : hackForm.thumbnail_url ? 'Change image' : 'Upload image'}
                    </Button>
                    {hackForm.thumbnail_url && (
                      <button type="button" onClick={() => setHackForm((f) => ({ ...f, thumbnail_url: '' }))} className="block text-xs text-white/40 hover:text-red-400">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </Field>
              <Field label="Event title" htmlFor="title" className="sm:col-span-2">
                <Input id="title" required value={hackForm.title} onChange={(e) => setHackForm((f) => ({ ...f, title: e.target.value }))} />
              </Field>
              <Field label="Start date" htmlFor="start_date">
                <Input id="start_date" type="date" value={hackForm.start_date} onChange={(e) => setHackForm((f) => ({ ...f, start_date: e.target.value }))} />
              </Field>
              <Field label="End date" htmlFor="end_date">
                <Input id="end_date" type="date" value={hackForm.end_date} onChange={(e) => setHackForm((f) => ({ ...f, end_date: e.target.value }))} />
              </Field>
              <Field label="Registration deadline" htmlFor="registration_deadline">
                <Input id="registration_deadline" type="date" value={hackForm.registration_deadline} onChange={(e) => setHackForm((f) => ({ ...f, registration_deadline: e.target.value }))} />
              </Field>
              <Field label="Location" htmlFor="location">
                <Input id="location" placeholder="Remote / City, IN" value={hackForm.location} onChange={(e) => setHackForm((f) => ({ ...f, location: e.target.value }))} />
              </Field>
              <Field label="Prize" htmlFor="prize">
                <Input id="prize" placeholder="₹1,00,000 prize pool" value={hackForm.prize} onChange={(e) => setHackForm((f) => ({ ...f, prize: e.target.value }))} />
              </Field>
              <Field label="Tags" htmlFor="tags" hint="Comma-separated">
                <Input id="tags" placeholder="AI, Climate..." value={hackForm.tags} onChange={(e) => setHackForm((f) => ({ ...f, tags: e.target.value }))} />
              </Field>

              <div className="sm:col-span-2 rounded-xl border border-organizer/25 bg-organizer-soft/40 p-4">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-organizer">
                  <Users2 size={13} /> Team setup for this hackathon
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Members per team" htmlFor="team_size" hint={`Leave blank to use the default of ${TEAM_CAPACITY}.`}>
                    <Input
                      id="team_size"
                      type="number"
                      min={1}
                      placeholder={String(TEAM_CAPACITY)}
                      value={hackForm.team_size}
                      onChange={(e) => setHackForm((f) => ({ ...f, team_size: e.target.value }))}
                    />
                  </Field>
                  <Field label="Min. female members per team" htmlFor="min_female_members" hint="Leave blank to require at least 1.">
                    <Input
                      id="min_female_members"
                      type="number"
                      min={0}
                      placeholder="1"
                      value={hackForm.min_female_members}
                      onChange={(e) => setHackForm((f) => ({ ...f, min_female_members: e.target.value }))}
                    />
                  </Field>
                </div>
              </div>

              <div className="sm:col-span-2 rounded-xl border border-organizer/25 bg-organizer-soft/40 p-4">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-organizer">
                  <Link2 size={13} /> Community links
                </p>
                <p className="mb-3 text-xs text-white/40">
                  Shown to students right after they submit their registration — WhatsApp, Discord, Telegram, or any group you want them to join.
                </p>
                <div className="space-y-2">
                  {hackForm.community_links.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Label (e.g. WhatsApp)"
                        value={link.label}
                        onChange={(e) => updateCommunityLink(index, 'label', e.target.value)}
                        className="w-36 shrink-0"
                      />
                      <Input
                        placeholder="https://chat.whatsapp.com/..."
                        value={link.url}
                        onChange={(e) => updateCommunityLink(index, 'url', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeCommunityLinkRow(index)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-bg-border text-white/35 hover:border-red-400/40 hover:text-red-400"
                        aria-label="Remove link"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addCommunityLinkRow}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium text-organizer hover:brightness-110"
                >
                  <Plus size={13} /> Add another link
                </button>
              </div>

              <Field label="Description" htmlFor="description" className="sm:col-span-2">
                <Textarea id="description" value={hackForm.description} onChange={(e) => setHackForm((f) => ({ ...f, description: e.target.value }))} />
              </Field>
              <Field label="Rules & guidelines" htmlFor="rules" className="sm:col-span-2">
                <Textarea id="rules" value={hackForm.rules} onChange={(e) => setHackForm((f) => ({ ...f, rules: e.target.value }))} />
              </Field>
              {thumbError && <p className="text-sm text-red-400 sm:col-span-2">{thumbError}</p>}
              {publishError && <p className="text-sm text-red-400 sm:col-span-2">{publishError}</p>}
              <Button type="submit" className="sm:col-span-2 sm:w-fit" disabled={publishing}>
                {publishing ? 'Publishing…' : 'Publish Hackathon'}
              </Button>
            </form>
          ) : (
            <form onSubmit={createInternship} className="grid gap-4 sm:grid-cols-2">
              <Field label="Thumbnail" htmlFor="int-thumb" className="sm:col-span-2" hint="Shown on internship cards and the overview feed. Image under 2MB.">
                <input ref={intThumbInputRef} id="int-thumb" type="file" accept="image/*" className="hidden" onChange={(e) => pickThumbnail(e, setIntForm)} />
                <div className="flex items-center gap-3">
                  {intForm.thumbnail_url ? (
                    <img src={intForm.thumbnail_url} alt="" className="h-16 w-28 shrink-0 rounded-lg border border-bg-border object-cover" />
                  ) : (
                    <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-lg border border-dashed border-bg-border text-white/25">
                      <ImageIcon size={20} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Button type="button" variant="outline" className="!py-1.5 text-xs" onClick={() => intThumbInputRef.current?.click()} disabled={thumbUploading}>
                      {thumbUploading ? 'Uploading…' : intForm.thumbnail_url ? 'Change image' : 'Upload image'}
                    </Button>
                    {intForm.thumbnail_url && (
                      <button type="button" onClick={() => setIntForm((f) => ({ ...f, thumbnail_url: '' }))} className="block text-xs text-white/40 hover:text-red-400">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </Field>
              <Field label="Role title" htmlFor="ititle" className="sm:col-span-2">
                <Input id="ititle" required value={intForm.title} onChange={(e) => setIntForm((f) => ({ ...f, title: e.target.value }))} />
              </Field>
              <Field label="Company" htmlFor="company">
                <Input id="company" placeholder={user?.full_name} value={intForm.company} onChange={(e) => setIntForm((f) => ({ ...f, company: e.target.value }))} />
              </Field>
              <Field label="Location" htmlFor="ilocation">
                <Input id="ilocation" placeholder="Remote / Hybrid..." value={intForm.location} onChange={(e) => setIntForm((f) => ({ ...f, location: e.target.value }))} />
              </Field>
              <Field label="Stipend" htmlFor="stipend">
                <Input id="stipend" placeholder="₹30,000/mo" value={intForm.stipend} onChange={(e) => setIntForm((f) => ({ ...f, stipend: e.target.value }))} />
              </Field>
              <Field label="Duration" htmlFor="duration">
                <Input id="duration" placeholder="3 months" value={intForm.duration} onChange={(e) => setIntForm((f) => ({ ...f, duration: e.target.value }))} />
              </Field>
              <Field label="Application deadline" htmlFor="deadline" className="sm:col-span-2">
                <Input id="deadline" type="date" value={intForm.deadline} onChange={(e) => setIntForm((f) => ({ ...f, deadline: e.target.value }))} />
              </Field>
              <Field label="Description" htmlFor="idescription" className="sm:col-span-2">
                <Textarea id="idescription" value={intForm.description} onChange={(e) => setIntForm((f) => ({ ...f, description: e.target.value }))} />
              </Field>
              <Field label="Responsibilities" htmlFor="responsibilities" className="sm:col-span-2">
                <Textarea id="responsibilities" value={intForm.responsibilities} onChange={(e) => setIntForm((f) => ({ ...f, responsibilities: e.target.value }))} />
              </Field>
              <Field label="Requirements" htmlFor="requirements" className="sm:col-span-2">
                <Textarea id="requirements" value={intForm.requirements} onChange={(e) => setIntForm((f) => ({ ...f, requirements: e.target.value }))} />
              </Field>
              {thumbError && <p className="text-sm text-red-400 sm:col-span-2">{thumbError}</p>}
              {publishError && <p className="text-sm text-red-400 sm:col-span-2">{publishError}</p>}
              <Button type="submit" className="sm:col-span-2 sm:w-fit" disabled={publishing}>
                {publishing ? 'Publishing…' : 'Publish Internship'}
              </Button>
            </form>
          )}
        </Card>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {combined.map((e) => (
          <Card key={e.id} className={e.isOwn ? undefined : 'opacity-70'}>
            {e.thumbnail_url && (
              <img src={e.thumbnail_url} alt="" className="-mx-6 -mt-6 mb-4 h-36 w-[calc(100%+3rem)] rounded-t-2xl object-cover" />
            )}
            <div className="mb-3 flex items-center justify-between">
              <Badge variant={e.kind === 'hackathon' ? 'organizer' : 'volunteer'} className="capitalize">
                {e.status || 'open'}
              </Badge>
              {e.isOwn ? (
                <Badge variant="success" className="text-[10px]">Your Event</Badge>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-white/35">
                  <Lock size={11} /> {e.organizer_name}
                </span>
              )}
            </div>
            <h3 className="font-display text-base font-semibold">{e.title}</h3>
            <p className="mt-2 text-sm text-white/45 line-clamp-2">{e.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/40">
              <span className="flex items-center gap-1.5"><CalendarDays size={13} /> {formatDate(e.kind === 'hackathon' ? e.start_date : e.deadline)}</span>
              {e.location && <span className="flex items-center gap-1.5"><MapPin size={13} /> {e.location}</span>}
              {e.stipend && <span className="flex items-center gap-1.5"><Wallet size={13} /> {e.stipend}</span>}
              <span className="flex items-center gap-1"><Users2 size={12} /> {e.participants || 0} participants</span>
            </div>
            {e.kind === 'hackathon' && (e.team_size || e.min_female_members) && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {e.team_size && (
                  <span className="rounded-full border border-bg-border px-2.5 py-1 text-[11px] text-white/45">
                    {e.team_size} members / team
                  </span>
                )}
                {!!e.min_female_members && (
                  <span className="rounded-full border border-bg-border px-2.5 py-1 text-[11px] text-white/45">
                    Min {e.min_female_members} female / team
                  </span>
                )}
              </div>
            )}

            {e.isOwn ? (
              <>
                <Link
                  to={`/dashboard/organizer/events/${e.kind}/${e.id}`}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-organizer/30 bg-organizer-soft py-2 text-xs font-medium text-organizer hover:brightness-110"
                >
                  Manage this event <ArrowUpRight size={13} />
                </Link>

                {noticeFor?.id === e.id ? (
                  <form onSubmit={submitNotice} className="mt-3 space-y-2 rounded-xl border border-bg-border bg-white/[0.02] p-3">
                    <Input placeholder="Notice title" required value={noticeForm.title} onChange={(ev) => setNoticeForm((f) => ({ ...f, title: ev.target.value }))} />
                    <Textarea placeholder="Details for students/volunteers" value={noticeForm.content} onChange={(ev) => setNoticeForm((f) => ({ ...f, content: ev.target.value }))} />
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1 !py-2 text-xs">Post Notice</Button>
                      <Button type="button" variant="outline" className="!py-2 text-xs" onClick={() => setNoticeFor(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setNoticeFor({ kind: e.kind, id: e.id })}
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white/45 hover:text-white"
                  >
                    <Megaphone size={13} /> Add Notice ({e.notices?.length || 0})
                  </button>
                )}
              </>
            ) : (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-white/30">
                <Lock size={12} /> Only the organizer who created this event can manage it.
              </p>
            )}
          </Card>
        ))}
        {combined.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-sm text-white/30">
            Nothing published yet.
          </p>
        )}
      </div>
    </DashboardShell>
  )
}
