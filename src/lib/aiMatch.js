// ---------------------------------------------------------------------------
// AI Matching Engine
// ---------------------------------------------------------------------------
// A deterministic, explainable "AI" scoring layer that powers:
//   Phase 5 — AI Teammate Matching   (matchTeammates, getTeamTemplate, getMissingRoles)
//   Phase 6 — AI Opportunity Recs    (recommendHackathons, recommendInternships, recommendTeams)
//
// No external model calls are made — everything runs client-side against the
// same mock/local data the rest of the app already uses, so results are
// instant and fully explainable (every score ships with the reasons behind
// it). This keeps the "AI" swappable for a real LLM/embedding backend later
// without touching any UI code — pages only ever consume the exported
// functions below.
import { daysUntil } from './utils'

// Which roles best complement a given role on a hackathon team. Used both to
// rank candidate teammates and to explain *why* someone was recommended.
export const ROLE_COMPLEMENTS = {
  'Frontend Developer': ['Backend Developer', 'UI/UX Designer', 'Data Scientist / ML'],
  'Backend Developer': ['Frontend Developer', 'DevOps Engineer', 'Data Scientist / ML'],
  'Full-stack Developer': ['UI/UX Designer', 'Data Scientist / ML', 'Product Manager'],
  'UI/UX Designer': ['Frontend Developer', 'Backend Developer', 'Product Manager'],
  'Data Scientist / ML': ['Frontend Developer', 'Backend Developer', 'Product Manager'],
  'DevOps Engineer': ['Backend Developer', 'Frontend Developer'],
  'Product Manager': ['Frontend Developer', 'Backend Developer', 'UI/UX Designer'],
  'QA / Tester': ['Frontend Developer', 'Backend Developer'],
  Other: ['Frontend Developer', 'Backend Developer', 'UI/UX Designer'],
}

// Ideal team composition templates by hackathon category/interest — this is
// what powers the "Suggested Team Composition" panel.
export const CATEGORY_TEAM_TEMPLATES = {
  'AI/ML': ['Frontend Developer', 'Backend Developer', 'Data Scientist / ML', 'Product Manager'],
  'Civic Tech': ['Frontend Developer', 'Backend Developer', 'UI/UX Designer', 'Data Scientist / ML'],
  Climate: ['Backend Developer', 'Data Scientist / ML', 'UI/UX Designer', 'Frontend Developer'],
  Fintech: ['Backend Developer', 'Frontend Developer', 'Data Scientist / ML', 'QA / Tester'],
  Health: ['Data Scientist / ML', 'Backend Developer', 'UI/UX Designer', 'Frontend Developer'],
  Web3: ['Backend Developer', 'Frontend Developer', 'DevOps Engineer', 'UI/UX Designer'],
  'Open Data': ['Data Scientist / ML', 'Backend Developer', 'Frontend Developer'],
  EdTech: ['Frontend Developer', 'UI/UX Designer', 'Backend Developer', 'Product Manager'],
  Gaming: ['Frontend Developer', 'UI/UX Designer', 'Backend Developer'],
  'Cyber Security': ['Backend Developer', 'DevOps Engineer', 'Frontend Developer'],
  Cloud: ['DevOps Engineer', 'Backend Developer', 'Frontend Developer'],
  'UI/UX': ['UI/UX Designer', 'Frontend Developer', 'Backend Developer'],
  default: ['Frontend Developer', 'Backend Developer', 'UI/UX Designer', 'Data Scientist / ML'],
}

function norm(list = []) {
  return list.map((x) => String(x).toLowerCase().trim())
}

function overlap(a = [], b = []) {
  const setB = new Set(norm(b))
  return a.filter((x) => setB.has(String(x).toLowerCase().trim()))
}

function unionSize(a = [], b = []) {
  return new Set([...norm(a), ...norm(b)]).size
}

export function getTeamTemplate(category) {
  return CATEGORY_TEAM_TEMPLATES[category] || CATEGORY_TEAM_TEMPLATES.default
}

// ---------------------------------------------------------------------------
// Phase 5 — AI Teammate Matching
// ---------------------------------------------------------------------------
// input: { skills: string[], interests: string[], preferredRole: string, category: string }
// candidate: a student profile { id, full_name, role, skills, interests, availability, ... }
export function scoreTeammate(input, candidate) {
  const { skills = [], interests = [], preferredRole = '', category = '' } = input
  const candSkills = candidate.skills || []
  const candInterests = candidate.interests || []
  const candRole = candidate.role || candidate.preferredRole || ''

  const complements = ROLE_COMPLEMENTS[preferredRole] || []
  let roleScore = 20 // baseline — a differently-skilled teammate still has value
  let isComplementaryRole = false
  if (preferredRole && candRole === preferredRole) {
    roleScore = 12 // same role = useful backup, but less urgently needed
  } else if (complements.includes(candRole)) {
    roleScore = 35
    isComplementaryRole = true
  }

  const interestPool = category ? [...interests, category] : interests
  const sharedInterests = overlap(interestPool, candInterests)
  const interestScore = (sharedInterests.length / (unionSize(interestPool, candInterests) || 1)) * 35

  const sharedSkills = overlap(skills, candSkills)
  const skillScore = (sharedSkills.length / (unionSize(skills, candSkills) || 1)) * 20

  const availabilityScore = candidate.availability === 'Available' ? 13 : candidate.availability === 'Busy' ? 5 : 0

  const score = Math.round(Math.min(100, Math.max(0, roleScore + interestScore + skillScore + availabilityScore)))

  return { score, sharedInterests, sharedSkills, isComplementaryRole, candidateRole: candRole }
}

export function matchTeammates(input, candidates = []) {
  return candidates
    .map((profile) => ({ profile, ...scoreTeammate(input, profile) }))
    .sort((a, b) => b.score - a.score)
}

// Roles from the ideal composition for this category that aren't covered by
// the user's own preferred role or by their current top matches.
export function getMissingRoles(input, topMatches = []) {
  const template = getTeamTemplate(input.category)
  const covered = new Set([input.preferredRole, ...topMatches.map((m) => m.candidateRole || m.profile?.role)].filter(Boolean))
  return template.filter((role) => !covered.has(role))
}

// ---------------------------------------------------------------------------
// Phase 6 — AI Opportunity Recommendation
// ---------------------------------------------------------------------------
export function scoreHackathon(profile, hackathon) {
  const pool = [...(profile.skills || []), ...(profile.interests || [])]
  const tags = hackathon.tags || []
  const shared = overlap(pool, tags)
  let score = (shared.length / (unionSize(pool, tags) || 1)) * 65

  const days = daysUntil(hackathon.registration_deadline)
  if (hackathon.status === 'open') score += 20
  if (days != null && days > 0 && days <= 14) score += 15

  score = Math.round(Math.min(100, Math.max(0, score)))

  const reasons = []
  if (shared.length) reasons.push(`Matches your ${shared.slice(0, 2).join(' & ')} interest${shared.length > 1 ? 's' : ''}`)
  if (hackathon.status === 'open') reasons.push('Registrations open now')
  if (days != null && days > 0 && days <= 14) reasons.push(`Only ${days}d left to register`)
  if (!reasons.length) reasons.push('New opportunity worth exploring')

  return { score, reasons, sharedTags: shared }
}

export function scoreInternship(profile, internship) {
  const skills = profile.skills || []
  const haystack = `${internship.title} ${internship.description || ''} ${internship.requirements || ''}`.toLowerCase()
  const matchedSkills = skills.filter((s) => haystack.includes(String(s).toLowerCase()))

  let score = Math.min(65, matchedSkills.length * 22)
  const days = daysUntil(internship.deadline)
  if (days != null && days > 0) score += 20
  if (days != null && days > 0 && days <= 10) score += 15

  score = Math.round(Math.min(100, Math.max(0, score)))

  const reasons = []
  if (matchedSkills.length) reasons.push(`Uses your ${matchedSkills.slice(0, 2).join(' & ')} skill${matchedSkills.length > 1 ? 's' : ''}`)
  if (days != null && days > 0 && days <= 10) reasons.push(`Deadline in ${days}d — apply soon`)
  if (!reasons.length) reasons.push('New opportunity worth exploring')

  return { score, reasons, matchedSkills }
}

// ---------------------------------------------------------------------------
// Organizer Judging — AI Project Scoring
// ---------------------------------------------------------------------------
// Deterministic, explainable heuristic that scores a hackathon submission on
// completeness (repo/demo/video = signal of a real shippable project),
// description substance, and tech-stack breadth/overlap with the hackathon's
// tags. Same shape as scoreHackathon/scoreInternship — { score, reasons } —
// so the Judging UI can render it exactly like the other scorers, and this
// is what the app always falls back to if Gemini isn't configured.
export function scoreSubmission(submission = {}, hackathon = {}) {
  const reasons = []

  // Completeness — up to 35 pts
  let completeness = 0
  if (submission.repo_url) completeness += 15
  if (submission.demo_url) completeness += 12
  if (submission.video_url) completeness += 8
  if (completeness >= 20) reasons.push('Ships with repo, demo, or video proof')
  else if (completeness > 0) reasons.push('Only partial proof of a working build')
  else reasons.push('No repo, demo, or video link provided')

  // Description substance — up to 30 pts
  const descLen = String(submission.description || '').trim().length
  let descScore = 0
  if (descLen > 220) descScore = 30
  else if (descLen > 120) descScore = 20
  else if (descLen > 40) descScore = 10
  if (descScore >= 20) reasons.push('Detailed, substantive project description')
  else if (descScore > 0) reasons.push('Description is thin — could use more detail')
  else reasons.push('Little to no description provided')

  // Tech stack breadth + overlap with hackathon tags — up to 35 pts
  const stack = submission.tech_stack || []
  const tags = hackathon.tags || []
  const shared = overlap(stack, tags)
  const breadthScore = Math.min(15, stack.length * 3)
  const overlapScore = Math.min(20, shared.length * 10)
  if (shared.length) reasons.push(`Tech stack aligns with ${shared.slice(0, 2).join(' & ')}`)
  else if (stack.length) reasons.push(`Uses a ${stack.length}-technology stack`)

  const score = Math.round(Math.min(100, Math.max(0, completeness + descScore + breadthScore + overlapScore)))

  return { score, reasons: reasons.slice(0, 3) }
}

export function recommendHackathons(profile, hackathons = []) {
  return hackathons
    .map((hackathon) => ({ hackathon, ...scoreHackathon(profile, hackathon) }))
    .sort((a, b) => b.score - a.score)
}

export function recommendInternships(profile, internships = []) {
  return internships
    .map((internship) => ({ internship, ...scoreInternship(profile, internship) }))
    .sort((a, b) => b.score - a.score)
}

// Recommend open teams that need this student — surfaces recruitment-style
// matches ("Teams looking for you") to round out the recommendation engine.
export function recommendTeams(profile, teams = [], preferredRole = '') {
  return teams
    .filter((t) => (t.openSlots || 0) > 0 && !(t.members || []).some((m) => m.id === profile?.id))
    .map((team) => {
      const roleNeeded = preferredRole && (team.rolesNeeded || []).includes(preferredRole)
      const sharedSkills = overlap(profile.skills || [], team.skills || [])
      const sharedInterests = overlap(profile.interests || [], team.interests || [])

      let score = 0
      if (roleNeeded) score += 45
      score += Math.min(30, sharedSkills.length * 10)
      score += Math.min(25, sharedInterests.length * 12)
      score = Math.round(Math.min(100, score))

      const reasons = []
      if (roleNeeded) reasons.push(`Looking for a ${preferredRole}`)
      if (sharedSkills.length) reasons.push(`Shares ${sharedSkills.slice(0, 2).join(' & ')}`)
      if (sharedInterests.length) reasons.push(`Also into ${sharedInterests.slice(0, 2).join(' & ')}`)

      return { team, score, reasons, sharedSkills, sharedInterests }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
}
