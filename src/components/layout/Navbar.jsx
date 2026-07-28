import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Zap } from 'lucide-react'
import Button from '../ui/Button'
import { useAuth } from '../../context/AuthContext'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'Opportunities', href: '#opportunities' },
  { label: 'Community', href: '#community' },
  { label: 'About', href: '#about' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-bg-border bg-bg/80 backdrop-blur-lg' : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-student via-volunteer to-organizer">
            <Zap size={15} className="fill-black text-black" />
          </span>
          SabrConnect
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="text-sm text-white/60 transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <Button variant="outline" onClick={() => navigate(`/dashboard/${user.role}`)}>
              Go to Dashboard
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate('/signin')}>
                Log In
              </Button>
              <Button onClick={() => navigate('/signup')}>Get Started</Button>
            </>
          )}
        </div>

        <button className="text-white/70 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-bg-border bg-bg px-6 pb-6 pt-2 md:hidden">
          <nav className="flex flex-col gap-4 py-4">
            {links.map((link) => (
              <a key={link.label} href={link.href} className="text-sm text-white/70" onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-3">
            {user ? (
              <Button variant="outline" onClick={() => navigate(`/dashboard/${user.role}`)}>
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate('/signin')}>
                  Log In
                </Button>
                <Button onClick={() => navigate('/signup')}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
