export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const DEV_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Full-stack Developer',
  'UI/UX Designer',
  'Data Scientist / ML',
  'DevOps Engineer',
  'Product Manager',
  'QA / Tester',
  'Other',
]

export const SKILL_SUGGESTIONS = [
  'React', 'JavaScript', 'TypeScript', 'Python', 'Node.js', 'Java', 'C++',
  'Figma', 'UI Design', 'Data Viz', 'ML', 'TensorFlow', 'SQL', 'AWS',
  'Docker', 'Kubernetes', 'Flutter', 'Swift', 'Kotlin', 'Go',
]

export const HACKATHON_INTERESTS = [
  'AI/ML', 'Civic Tech', 'Climate', 'Fintech', 'Health', 'Web3',
  'Open Data', 'EdTech', 'Gaming', 'Cyber Security', 'Cloud', 'UI/UX',
]

export const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

export const AVAILABILITY_STATUSES = ['Available', 'Busy', 'Not Available']

export const TEAM_LOGO_OPTIONS = ['🚀', '🧠', '⚡', '🔥', '🛠️', '🌐', '🎯', '🧩', '🦾', '🌱', '💡', '🛰️']

// Fixed team size for the simplified registration flow (leader + 5 members).
export const TEAM_CAPACITY = 6

export const GENDER_OPTIONS = ['Male', 'Female', 'Other']

export const COLLEGE_OPTIONS = [
  'GCRG College of Engineering',
  'GCRG College of Pharmacy',
  'GCRG College of ITI',
  'GCRG Diploma',
  'GCRG College of Nursing',
  'GCRG College of Management',
]

// Short, human-typeable code teammates use to join a team directly
// (no ambiguous characters like 0/O or 1/I).
export function generateTeamCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export const POST_TYPES = [
  { id: 'project', label: 'Project Update' },
  { id: 'hackathon_achievement', label: 'Hackathon Achievement' },
  { id: 'internship_achievement', label: 'Internship Achievement' },
  { id: 'recruitment', label: 'Team Recruitment' },
  { id: 'opportunity_share', label: 'Opportunity Share' },
]

export function postTypeMeta(type) {
  return {
    project: { label: 'Project Update', tone: 'text-student border-student/30 bg-student-soft' },
    hackathon_achievement: { label: 'Hackathon Win', tone: 'text-organizer border-organizer/30 bg-organizer-soft' },
    internship_achievement: { label: 'Internship News', tone: 'text-volunteer border-volunteer/30 bg-volunteer-soft' },
    recruitment: { label: 'Recruiting', tone: 'text-white/70 border-bg-border bg-white/[0.05]' },
    opportunity_share: { label: 'Opportunity Share', tone: 'text-organizer border-organizer/30 bg-organizer-soft' },
  }[type] || { label: 'Update', tone: 'text-white/50 border-bg-border bg-white/[0.03]' }
}

// Where a given role's Opportunity Feed lives — used to build role-correct
// notification links from a post (which may have been authored by a
// student, volunteer, or organizer).
export function feedPath(role = 'student') {
  return `/dashboard/${role}/feed`
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function experienceTone(level) {
  return {
    Beginner: 'text-white/50 border-bg-border bg-white/[0.03]',
    Intermediate: 'text-volunteer border-volunteer/30 bg-volunteer-soft',
    Advanced: 'text-student border-student/30 bg-student-soft',
    Expert: 'text-organizer border-organizer/30 bg-organizer-soft',
  }[level] || 'text-white/50 border-bg-border bg-white/[0.03]'
}

export function availabilityTone(status) {
  return {
    Available: 'text-student border-student/30 bg-student-soft',
    Busy: 'text-organizer border-organizer/30 bg-organizer-soft',
    'Not Available': 'text-white/40 border-bg-border bg-white/[0.03]',
  }[status] || 'text-white/40 border-bg-border bg-white/[0.03]'
}

export function splitTags(value = '') {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

export function formatDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function daysUntil(dateString) {
  if (!dateString) return null
  const diff = new Date(dateString).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export const roleTheme = {
  student: {
    label: 'Student',
    color: '#10B981',
    className: 'student',
    bg: 'bg-student',
    text: 'text-student',
    border: 'border-student/30',
    soft: 'bg-student-soft',
  },
  volunteer: {
    label: 'Volunteer',
    color: '#0EA5E9',
    className: 'volunteer',
    bg: 'bg-volunteer',
    text: 'text-volunteer',
    border: 'border-volunteer/30',
    soft: 'bg-volunteer-soft',
  },
  organizer: {
    label: 'Organizer',
    color: '#F59E0B',
    className: 'organizer',
    bg: 'bg-organizer',
    text: 'text-organizer',
    border: 'border-organizer/30',
    soft: 'bg-organizer-soft',
  },
}
