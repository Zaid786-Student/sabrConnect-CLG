import { useState } from 'react'
import { Megaphone, Plus, X } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Field } from '../../components/ui/Input'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../lib/utils'

export default function OrganizerAnnouncements() {
  const { user } = useAuth()
  const { announcements, addAnnouncement } = useData()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })

  const publish = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    addAnnouncement(form, user)
    setForm({ title: '', content: '' })
    setShowForm(false)
  }

  return (
    <DashboardShell role="organizer" title="Announcement Center" subtitle="Publish updates to students and volunteers.">
      <div className="mb-6 flex justify-end">
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Cancel' : 'New Announcement'}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form onSubmit={publish} className="space-y-4">
            <Field label="Title" htmlFor="title">
              <Input id="title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </Field>
            <Field label="Message" htmlFor="content">
              <Input id="content" required value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
            </Field>
            <Button type="submit">Publish</Button>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {announcements.map((a) => (
          <Card key={a.id} className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-organizer-soft text-organizer">
              <Megaphone size={17} />
            </div>
            <div>
              <h3 className="font-medium">{a.title}</h3>
              <p className="mt-1.5 text-sm text-white/50">{a.content}</p>
              <p className="mt-2 text-xs text-white/30">{a.organizer_name} · {formatDate(a.created_at)}</p>
            </div>
          </Card>
        ))}
      </div>
    </DashboardShell>
  )
}
