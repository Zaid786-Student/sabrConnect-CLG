import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg bg-grid px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-student via-volunteer to-organizer">
        <Zap size={22} className="fill-black text-black" />
      </span>
      <h1 className="mt-6 font-display text-4xl font-semibold">404</h1>
      <p className="mt-2 max-w-sm text-white/45">This page wandered off the roadmap. Let's get you back on track.</p>
      <Button as={Link} to="/" className="mt-8">
        Back to Home
      </Button>
    </div>
  )
}
