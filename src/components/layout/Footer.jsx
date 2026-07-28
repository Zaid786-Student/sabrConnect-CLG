import { Zap, Github, Twitter, Linkedin } from 'lucide-react'

const columns = [
  {
    title: 'Platform',
    links: ['Features', 'Opportunities', 'Community', 'About'],
  },
  {
    title: 'Legal',
    links: ['Privacy Policy', 'Terms of Service'],
  },
  {
    title: 'Contact',
    links: ['hello@sabrconnect.dev', 'Support Center'],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-bg-border bg-bg">
      <div className="container-page grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-student via-volunteer to-organizer">
              <Zap size={15} className="fill-black text-black" />
            </span>
            SabrConnect
          </div>
          <p className="mt-3 max-w-xs text-sm text-white/40">
            One ecosystem for students, volunteers, and organizers to discover opportunities and build what's next.
          </p>
          <div className="mt-5 flex gap-3">
            {[Github, Twitter, Linkedin].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-bg-border text-white/50 transition-colors hover:border-white/20 hover:text-white"
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <p className="eyebrow mb-4">{col.title}</p>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-white/50 transition-colors hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-bg-border py-6">
        <p className="container-page text-center text-xs text-white/30">
          © {new Date().getFullYear()} SabrConnect. Built for the IBM Innovation Submission.
        </p>
      </div>
    </footer>
  )
}
