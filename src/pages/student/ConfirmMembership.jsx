import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PartyPopper, ArrowLeft, CheckCircle2 } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input, { Field, Select } from '../../components/ui/Input'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { GENDER_OPTIONS } from '../../lib/utils'

const FIXED_COLLEGE = 'G.C.R.G Group of Institution'

const ERROR_MESSAGES = {
  NOT_FOUND: "This invite link isn't valid — double check the link your team leader shared.",
  ALREADY_CONFIRMED: "This spot has already been confirmed — if that wasn't you, contact your team leader.",
  UNKNOWN: 'Something went wrong. Please try again.',
}

export default function ConfirmMembership() {
  const { applicationId, token } = useParams()
  const { user } = useAuth()
  const { getApplicationById, confirmApplicationMember } = useData()

  const application = getApplicationById(applicationId)
  const pendingMember = application?.formData?.pendingMembers?.find((m) => m.token === token)

  const [form, setForm] = useState({ year: '2nd Year', gender: '', githubUrl: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!application || !pendingMember) {
    return (
      <DashboardShell role="student" title="Invite link" subtitle="">
        <Card className="mx-auto max-w-md text-center">
          <p className="text-sm text-white/60">
            {!application ? ERROR_MESSAGES.NOT_FOUND : ERROR_MESSAGES.NOT_FOUND}
          </p>
          <Button as={Link} to="/dashboard/student/hackathons" variant="outline" className="mt-5">
            <ArrowLeft size={15} /> Back to Hackathons
          </Button>
        </Card>
      </DashboardShell>
    )
  }

  if (pendingMember.confirmed || done) {
    return (
      <DashboardShell role="student" title="You're confirmed" subtitle={application.title}>
        <Card className="mx-auto max-w-md text-center">
          <PartyPopper className="mx-auto mb-3 text-student" size={30} />
          <h2 className="font-display text-lg font-semibold">You're on the team! 🎉</h2>
          <p className="mt-2 text-sm text-white/50">
            Your spot on <span className="text-white">{application.team_name || 'the team'}</span> for{' '}
            <span className="text-white">{application.title}</span> is confirmed.
          </p>
          <Button as={Link} to="/dashboard/student/applications" className="mt-5 w-full">
            View in Applications
          </Button>
        </Card>
      </DashboardShell>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.gender) {
      setError('Please select your gender.')
      return
    }
    setSubmitting(true)
    const result = await confirmApplicationMember(applicationId, token, user, {
      college: FIXED_COLLEGE,
      year: form.year,
      gender: form.gender,
      githubUrl: form.githubUrl,
    })
    setSubmitting(false)
    if (!result?.success) {
      setError(ERROR_MESSAGES[result?.error] || ERROR_MESSAGES.UNKNOWN)
      return
    }
    setDone(true)
  }

  return (
    <DashboardShell role="student" title="Confirm your spot" subtitle={application.title}>
      <Card className="mx-auto max-w-md">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-student" />
          <h2 className="font-display text-base font-semibold">Your team leader added you</h2>
        </div>
        <p className="mb-5 text-sm text-white/50">
          Confirm a few details to lock in your spot on <span className="text-white">{application.team_name || 'the team'}</span> for{' '}
          <span className="text-white">{application.title}</span>.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Your name" htmlFor="name">
            <Input id="name" value={pendingMember.name} disabled readOnly />
          </Field>
          <Field label="Your phone" htmlFor="phone">
            <Input id="phone" value={pendingMember.phone} disabled readOnly />
          </Field>
          <Field label="College" htmlFor="college">
            <Input id="college" value={FIXED_COLLEGE} disabled readOnly />
          </Field>
          <Field label="Year" htmlFor="year">
            <Select id="year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}>
              <option>1st Year</option>
              <option>2nd Year</option>
              <option>3rd Year</option>
              <option>4th Year</option>
              <option>Other</option>
            </Select>
          </Field>
          <Field label="Gender" htmlFor="gender">
            <Select id="gender" required value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
              <option value="">Select</option>
              {GENDER_OPTIONS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </Select>
          </Field>
          <Field label="GitHub profile (optional)" htmlFor="githubUrl">
            <Input
              id="githubUrl"
              placeholder="https://github.com/username"
              value={form.githubUrl}
              onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))}
            />
          </Field>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Confirming…' : 'Confirm My Spot'}
          </Button>
        </form>
      </Card>
    </DashboardShell>
  )
}
