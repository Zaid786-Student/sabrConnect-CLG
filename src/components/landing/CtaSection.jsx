import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'

export default function CtaSection() {
  const navigate = useNavigate()
  return (
    <section id="get-started" className="container-page py-24">
      <div className="relative overflow-hidden rounded-3xl border border-bg-border bg-bg-card px-8 py-16 text-center md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.12),transparent_60%)]" />
        <div className="relative">
          <p className="eyebrow mb-4">Prepared for IBM Submission</p>
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold md:text-4xl">
            Bring your students, volunteers, and organizers into one place.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/45">
            Set up your role, and SabrConnect handles the rest — discovery, teams, coordination, and tracking.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button onClick={() => navigate('/signup')}>
              Get Started <ArrowRight size={16} />
            </Button>
            <Button variant="outline" onClick={() => navigate('/signin')}>
              I already have an account
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
