import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MailCheck } from 'lucide-react'
import AuthLayout from './AuthLayout'
import Input, { Field } from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSupabaseConfigured) {
      await supabase.auth.resetPasswordForEmail(email)
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthLayout title="Check your inbox">
        <div className="rounded-xl border border-bg-border bg-white/[0.02] p-6 text-center">
          <MailCheck className="mx-auto mb-3 text-student" size={28} />
          <p className="text-sm text-white/60">
            If an account exists for <span className="text-white">{email}</span>, a reset link is on its way.
          </p>
        </div>
        <Link to="/signin" className="mt-6 block text-center text-sm font-medium text-white hover:underline">
          Back to login
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to set a new one.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full">
          Send reset link <ArrowRight size={16} />
        </Button>
      </form>
      <Link to="/signin" className="mt-6 block text-center text-sm text-white/40 hover:text-white">
        Back to login
      </Link>
    </AuthLayout>
  )
}
