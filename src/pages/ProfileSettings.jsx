import { useState } from 'react'
import { Check, Loader2, User } from 'lucide-react'
import DashboardShell from '../components/layout/DashboardShell'
import { Card } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input, { Field, Textarea, Select } from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { initials, roleTheme, splitTags, COLLEGE_OPTIONS } from '../lib/utils'

export default function ProfileSettings() {
  const { user, updateProfile } = useAuth()
  const { syncMemberProfileEverywhere } = useData()
  const theme = roleTheme[user?.role] || roleTheme.student

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    college: user?.college || '',
    bio: user?.bio || '',
    skills: (user?.skills || []).join(', '),
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({
        full_name: form.full_name,
        college: form.college,
        bio: form.bio,
        skills: splitTags(form.skills),
      })
      if (user?.role === 'student') {
        await syncMemberProfileEverywhere(user.id, {
          full_name: form.full_name,
          bio: form.bio,
          skills: splitTags(form.skills),
        })
      }
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardShell role={user?.role} title="Profile Settings" subtitle="Manage your account details">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="flex items-center gap-4">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-xl text-lg font-semibold text-black ${theme.bg}`}
          >
            {initials(user?.full_name) || <User size={20} />}
          </span>
          <div>
            <p className="text-base font-semibold">{user?.full_name}</p>
            <p className="text-sm text-white/45">{user?.email}</p>
            <Badge variant={user?.role} className="mt-2">
              {theme.label}
            </Badge>
          </div>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card className="space-y-5">
            <Field label="Full name" htmlFor="full_name">
              <Input id="full_name" value={form.full_name} onChange={handleChange('full_name')} />
            </Field>

            <Field label="Email" htmlFor="email" hint="Contact support to change your sign-in email.">
              <Input id="email" value={user?.email || ''} disabled className="opacity-60" />
            </Field>

            {user?.role === 'student' && (
              <>
                <Field label="College" htmlFor="college">
                  <Select id="college" required value={form.college} onChange={handleChange('college')}>
                    <option value="">Select</option>
                    {COLLEGE_OPTIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Skills" htmlFor="skills" hint="Comma-separated, e.g. React, Python, UI Design">
                  <Input id="skills" value={form.skills} onChange={handleChange('skills')} />
                </Field>
              </>
            )}

            <Field label="Bio" htmlFor="bio">
              <Textarea
                id="bio"
                value={form.bio}
                onChange={handleChange('bio')}
                placeholder="Tell others a little about yourself"
              />
            </Field>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
                {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </DashboardShell>
  )
}
