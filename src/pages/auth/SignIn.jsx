import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import AuthLayout from './AuthLayout'
import Input, { Field } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import GoogleIcon from '../../components/ui/GoogleIcon'
import { useAuth } from '../../context/AuthContext'

export default function SignIn() {
  const navigate = useNavigate()
  const { signIn, signInWithGoogle } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await signIn(form)
      navigate(`/dashboard/${user.role}`)
    } catch (err) {
      setError(err.message || 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  // No role is passed here on purpose — signing in should never change an
  // existing account's role. Role selection only matters at signup.
  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      const user = await signInWithGoogle()
      if (user) navigate(`/dashboard/${user.role}`)
    } catch (err) {
      setError(err.message || 'Unable to continue with Google.')
      setGoogleLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue where you left off.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <div className="flex items-center justify-between">
            <span />
            <Link to="/forgot-password" className="text-xs text-white/40 hover:text-white/70">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />
        </Field>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Log in'} <ArrowRight size={16} />
        </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        className="mt-3 w-full"
        disabled={googleLoading}
        onClick={handleGoogle}
      >
        <GoogleIcon /> {googleLoading ? 'Connecting…' : 'Continue with Google'}
      </Button>

      <p className="mt-6 text-center text-sm text-white/40">
        New to SabrConnect?{' '}
        <Link to="/signup" className="font-medium text-white hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
