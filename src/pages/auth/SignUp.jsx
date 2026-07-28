import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Clock3 } from 'lucide-react'
import AuthLayout from './AuthLayout'
import Input, { Field } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import RoleSelect from '../../components/ui/RoleSelect'
import GoogleIcon from '../../components/ui/GoogleIcon'
import { useAuth } from '../../context/AuthContext'

export default function SignUp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signUp, signInWithGoogle } = useAuth()
  const [googleLoading, setGoogleLoading] = useState(false)

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: location.state?.role || 'student',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // Set once a student/volunteer signup lands in 'pending' state, so we can
  // show a confirmation instead of dropping them straight into a dashboard
  // they don't have access to yet.
  const [pendingUser, setPendingUser] = useState(null)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const user = await signUp(form)
      if (user.status === 'pending') {
        setPendingUser(user)
      } else {
        navigate(`/dashboard/${user.role}`)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Passes the role the person just picked in the form above — that's what
  // lets "Organizer" + Continue with Google actually create/log in as an
  // organizer instead of always defaulting to student.
  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const user = await signInWithGoogle(form.role)
      if (user) {
        // Mock/local mode resolves instantly with no real redirect.
        navigate(`/dashboard/${user.role}`)
      }
      // Real Supabase mode: browser is being sent to Google now.
    } catch (err) {
      setError(err.message || 'Unable to continue with Google.')
      setGoogleLoading(false)
    }
  }

  if (pendingUser) {
    return (
      <AuthLayout title="Request sent" subtitle="An organizer needs to approve your account before you can log in.">
        <div className="rounded-xl border border-organizer/30 bg-organizer-soft px-5 py-6 text-center">
          <Clock3 className="mx-auto mb-3 text-organizer" size={24} />
          <p className="text-sm text-white/70">
            Thanks, {pendingUser.full_name || 'there'} — your {pendingUser.role} account request has been sent to
            the organizing team for approval. You'll be able to log in as soon as it's accepted.
          </p>
        </div>
        <Link
          to="/signin"
          className="mt-6 flex items-center justify-center gap-1.5 rounded-lg border border-bg-border py-2.5 text-sm font-medium text-white/70 hover:text-white"
        >
          Back to sign in
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your account" subtitle="Choose your role — you can refine details later.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="I am a...">
          <RoleSelect value={form.role} onChange={(role) => setForm((f) => ({ ...f, role }))} />
        </Field>

        <Field label="Full name" htmlFor="fullName">
          <Input id="fullName" required placeholder="Ananya Rao" value={form.fullName} onChange={update('fullName')} />
        </Field>

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={update('email')}
          />
        </Field>

        <Field label="Password" htmlFor="password" hint="At least 6 characters.">
          <Input
            id="password"
            type="password"
            required
            placeholder="••••••••"
            value={form.password}
            onChange={update('password')}
          />
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'} <ArrowRight size={16} />
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-bg-border" />
        <span className="text-xs text-white/30">or</span>
        <div className="h-px flex-1 bg-bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={googleLoading}
        onClick={handleGoogle}
      >
        <GoogleIcon /> {googleLoading ? 'Connecting…' : `Continue with Google as ${form.role}`}
      </Button>

      <p className="mt-6 text-center text-sm text-white/40">
        Already have an account?{' '}
        <Link to="/signin" className="font-medium text-white hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
