import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-white/40">
        Loading SabrConnect…
      </div>
    )
  }

  if (!user) return <Navigate to="/signin" replace />
  if (role && user.role !== role) return <Navigate to={`/dashboard/${user.role}`} replace />

  return <Outlet />
}
