import { Phone, Mail, Crown, Github, Linkedin } from 'lucide-react'
import { cn } from '../../lib/utils'

const lead = {
  name: 'Zaid Khan',
  role: 'Team Creator & Leader',
  phone: '+91 9532246205',
  email: 'khanzaid63945@gmail.com',
  accent: 'student',
}

const members = [
  {
    name: 'Mohammad Asif',
    role: 'Co-Lead',
    phone: '+91 8303629650',
    email: 'mathstrick45@gmail.com',
    accent: 'volunteer',
  },
  {
    name: 'Kamran',
    role: 'Member',
    phone: '+91 88819 23685',
    email: 'kamransiddique@gmail.com',
    accent: 'organizer',
  },
  {
    name: 'Asif Ansari',
    role: 'Member',
    phone: '+91 8009417834',
    email: 'asifxyz0686@gmail.com',
    accent: 'student',
  },
]

const accentStyles = {
  student: { soft: 'bg-student-soft', text: 'text-student', border: 'border-student/30' },
  volunteer: { soft: 'bg-volunteer-soft', text: 'text-volunteer', border: 'border-volunteer/30' },
  organizer: { soft: 'bg-organizer-soft', text: 'text-organizer', border: 'border-organizer/30' },
}

function MemberCard({ person, featured = false }) {
  const classes = accentStyles[person.accent] || accentStyles.student
  return (
    <div
      className={cn(
        'card relative flex flex-col gap-4 p-6 transition-colors hover:border-white/15',
        featured && 'md:p-8'
      )}
    >
      {featured && (
        <span className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-lg bg-student-soft text-student">
          <Crown size={15} />
        </span>
      )}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full font-display font-semibold',
            classes.soft,
            classes.text,
            featured ? 'h-14 w-14 text-lg' : 'h-12 w-12 text-base'
          )}
        >
          {person.name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')}
        </div>
        <div>
          <p className={cn('font-display font-semibold', featured ? 'text-lg' : 'text-base')}>{person.name}</p>
          <span className={cn('badge mt-1', classes.border, classes.soft, classes.text)}>{person.role}</span>
        </div>
      </div>
      <div className="space-y-2 border-t border-bg-border pt-4 text-sm text-white/50">
        <a href={`tel:${person.phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 transition-colors hover:text-white">
          <Phone size={14} className={classes.text} />
          {person.phone}
        </a>
        <a href={`mailto:${person.email}`} className="flex items-center gap-2 break-all transition-colors hover:text-white">
          <Mail size={14} className={classes.text} />
          {person.email}
        </a>
      </div>
    </div>
  )
}

export default function TeamSection() {
  return (
    <section id="about" className="container-page py-24">
      <div className="mb-12 max-w-2xl">
        <p className="eyebrow mb-3">About the project</p>
        <h2 className="text-3xl font-semibold md:text-4xl">Built by team SabrSquad.</h2>
        <p className="mt-4 text-white/45">
          SabrConnect was built as a single ecosystem for students, volunteers, and organizers — bringing
          hackathon discovery, internships, team formation, and event coordination into one login. It's the
          product of a small team that wanted to replace the five different tabs, spreadsheets, and group
          chats every campus community ends up juggling with one connected platform, prepared for the IBM
          Innovation Submission.
        </p>
      </div>

      <div className="mb-6">
        <MemberCard person={lead} featured />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {members.map((m) => (
          <MemberCard key={m.name} person={m} />
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-bg-border pt-8">
        <p className="text-sm text-white/40">Find the team online:</p>
        <a
          href="https://github.com/Zaid786-Student"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-bg-border px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
        >
          <Github size={16} />
          GitHub
        </a>
        <a
          href="https://www.linkedin.com/in/zaid-khan-4187a4414"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-bg-border px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
        >
          <Linkedin size={16} />
          LinkedIn
        </a>
        <a
          href="mailto:sabrsquadss786@gmail.com"
          className="flex items-center gap-2 rounded-lg border border-bg-border px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
        >
          <Mail size={16} />
          sabrsquadss786@gmail.com
        </a>
      </div>
    </section>
  )
}
