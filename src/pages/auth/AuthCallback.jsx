import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AuthLayout from './AuthLayout'

// Google redirects the browser back here after the person authenticates.
// AuthProvider's onAuthStateChange listener (see AuthContext.jsx) picks up
// the new session, corrects the role if needed, and loads the profile —
// this page just waits for `user` to show up, then sends them to the right
// dashboard. If nothing shows up after a few seconds (e.g. the person
// cancelled on Google's side), it falls back to the sign-in screen instead
// of leaving them stuck on a spinner forever.
export default function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (user) {
      navigate(`/dashboard/${user.role}`, { replace: true })
    }
  }, [user, navigate])

  useEffect(() => {
    if (loading || user) return
    const timer = setTimeout(() => setTimedOut(true), 4000)
    return () => clearTimeout(timer)
  }, [loading, user])

  useEffect(() => {
    if (timedOut && !user) navigate('/signin', { replace: true })
  }, [timedOut, user, navigate])

  return (
    <AuthLayout title="Signing you in…" subtitle="Just a moment while we finish setting up your account.">
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    </AuthLayout>
  )
}
