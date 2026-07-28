import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Wand2, Users2, PuzzleIcon, CheckCircle2 } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { Field, Select } from '../../components/ui/Input'
import MatchCard from '../../components/connect/MatchCard'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { getRegisteredUsers } from '../../lib/users'
import { seedStudentProfiles } from '../../data/mockData'
import { DEV_ROLES, SKILL_SUGGESTIONS, HACKATHON_INTERESTS } from '../../lib/utils'
import { matchTeammates, getTeamTemplate, getMissingRoles } from '../../lib/aiMatch'

export default function TeamMatcher() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { getConnectionStatus, sendConnectRequest, getOrCreateConversation } = useData()

  const [skills, setSkills] = useState(user?.skills || [])
  const [interests, setInterests] = useState([])
  const [preferredRole, setPreferredRole] = useState(DEV_ROLES[0])
  const [category, setCategory] = useState(HACKATHON_INTERESTS[0])
  const [hasRun, setHasRun] = useState(false)
  const [results, setResults] = useState([])
  const [allProfiles, setAllProfiles] = useState([])

  useEffect(() => {
    const registered = getRegisteredUsers().filter((u) => u.role === 'student')
    const merged = [...registered, ...seedStudentProfiles]
    const seen = new Set()
    const deduped = []
    merged.forEach((p) => {
      if (seen.has(p.id) || p.id === user?.id) return
      seen.add(p.id)
      deduped.push(p)
    })
    setAllProfiles(deduped)
  }, [user?.id])

  const toggleTag = (setter) => (tag) =>
    setter((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]))

  const runMatch = () => {
    const input = { skills, interests, preferredRole, category }
    const matched = matchTeammates(input, allProfiles).filter((m) => m.score > 0)
    setResults(matched)
    setHasRun(true)
  }

  const topMatches = results.slice(0, 3)
  const missingRoles = useMemo(
    () => (hasRun ? getMissingRoles({ preferredRole, category }, topMatches) : []),
    [hasRun, preferredRole, category, topMatches],
  )
  const teamTemplate = getTeamTemplate(category)

  const goMessage = (profile) => {
    getOrCreateConversation(user, profile)
    navigate('/dashboard/student/messages', { state: { openWith: profile.id } })
  }

  return (
    <DashboardShell
      role="student"
      title="AI Team Matcher"
      subtitle="Tell us who you are — our AI finds teammates who complete your team."
    >
      <div className="grid gap-6 lg:grid-cols-[380px,1fr]">
        {/* Input panel */}
        <Card className="h-fit space-y-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-student-soft text-student">
              <Wand2 size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold">Build your match profile</p>
              <p className="text-xs text-white/40">Used only for this recommendation.</p>
            </div>
          </div>

          <Field label="Your skills" hint="Tap to toggle. Selected skills weigh into skill-overlap scoring.">
            <div className="flex flex-wrap gap-2">
              {SKILL_SUGGESTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(setSkills)(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    skills.includes(tag)
                      ? 'border-student/30 bg-student-soft text-student'
                      : 'border-bg-border text-white/50 hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Your interests" hint="What kind of problems do you want to solve?">
            <div className="flex flex-wrap gap-2">
              {HACKATHON_INTERESTS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(setInterests)(tag)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    interests.includes(tag)
                      ? 'border-volunteer/30 bg-volunteer-soft text-volunteer'
                      : 'border-bg-border text-white/50 hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Preferred role" htmlFor="preferredRole">
            <Select id="preferredRole" value={preferredRole} onChange={(e) => setPreferredRole(e.target.value)}>
              {DEV_ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </Select>
          </Field>

          <Field label="Hackathon category" htmlFor="category">
            <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {HACKATHON_INTERESTS.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </Select>
          </Field>

          <Button className="w-full justify-center" onClick={runMatch}>
            <Sparkles size={15} /> Find My Dream Team
          </Button>
        </Card>

        {/* Results panel */}
        <div className="space-y-6">
          {!hasRun ? (
            <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-student-soft text-student">
                <Sparkles size={20} />
              </span>
              <p className="text-sm font-semibold">No matches yet</p>
              <p className="max-w-sm text-xs text-white/40">
                Fill in your skills, interests, preferred role and hackathon category, then run the matcher to see
                recommended teammates and a suggested team composition.
              </p>
            </Card>
          ) : (
            <>
              <Card className="space-y-4">
                <div className="flex items-center gap-2">
                  <PuzzleIcon size={16} className="text-organizer" />
                  <h2 className="font-display text-base font-semibold">Suggested Team Composition</h2>
                  <span className="text-xs text-white/35">for {category}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {teamTemplate.map((role) => {
                    const isYou = role === preferredRole
                    const isMissing = missingRoles.includes(role)
                    return (
                      <span
                        key={role}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
                          isYou
                            ? 'border-student/30 bg-student-soft text-student'
                            : isMissing
                            ? 'border-organizer/30 bg-organizer-soft text-organizer'
                            : 'border-bg-border bg-white/[0.03] text-white/55'
                        }`}
                      >
                        {isYou && <CheckCircle2 size={12} />}
                        {role} {isYou ? '(You)' : isMissing ? '· Needed' : '· Covered'}
                      </span>
                    )
                  })}
                </div>
                {missingRoles.length > 0 && (
                  <p className="text-xs text-white/40">
                    Your team is still missing:{' '}
                    <span className="font-medium text-organizer">{missingRoles.join(', ')}</span>. The recommended
                    teammates below help fill these gaps.
                  </p>
                )}
              </Card>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Users2 size={16} className="text-student" />
                  <h2 className="font-display text-base font-semibold">Recommended Teammates</h2>
                  <span className="text-xs text-white/35">({results.length} found)</span>
                </div>

                {results.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-xs text-white/30">
                    No strong matches yet — try adding more skills or interests.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {results.map((match) => (
                      <MatchCard
                        key={match.profile.id}
                        match={match}
                        connectionStatus={getConnectionStatus(user?.id, match.profile.id)}
                        onConnect={() => sendConnectRequest(user, match.profile)}
                        onMessage={() => goMessage(match.profile)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
