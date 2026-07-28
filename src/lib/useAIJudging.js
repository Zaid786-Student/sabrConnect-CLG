// ---------------------------------------------------------------------------
// useAIJudging
// ---------------------------------------------------------------------------
// Renders instantly using the local scoring engine (src/lib/aiMatch.js —
// scoreSubmission), then — if Supabase + the gemini-judge edge function are
// configured — silently re-scores using real Gemini output and swaps it in,
// along with a model-written `overall_verdict` for the "Recommended Winner"
// panel. If Gemini isn't configured or the call fails, the local results
// simply stay put. This keeps the organizer Judging tab demoable with zero
// setup while making the "AI" label true whenever Gemini is wired up.
//
// Takes the full `hackathon` object (not just its id) because the local
// heuristic needs the hackathon's tags to score tech-stack overlap.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react'
import { scoreSubmission } from './aiMatch'
import { getGeminiJudging } from './gemini'
import { isSupabaseConfigured } from './supabaseClient'

function scoreLocally(hackathon, submissions) {
  return submissions
    .map((submission) => ({ submission, ...scoreSubmission(submission, hackathon) }))
    .sort((a, b) => b.score - a.score)
}

export function useAIJudging(hackathon, submissions = []) {
  const local = useMemo(() => scoreLocally(hackathon || {}, submissions), [hackathon, submissions])

  // Only the Gemini score/reasons lookup is cached across renders — the
  // submission objects themselves are always taken fresh from `submissions`
  // (via `local`, or merged below), so an organizer action like Shortlist,
  // Mark Winner, or Reject is reflected immediately either way.
  const [geminiById, setGeminiById] = useState(null)
  const [verdict, setVerdict] = useState('')
  const [source, setSource] = useState('local')
  const [loading, setLoading] = useState(false)

  // Keyed on submission ids only (not the whole array) so that persisting an
  // ai_score back onto a submission — which changes the array's contents but
  // not its membership — doesn't re-trigger another Gemini call.
  const idsKey = useMemo(() => submissions.map((s) => s.id).sort().join(','), [submissions])

  useEffect(() => {
    setGeminiById(null)
    setVerdict('')
    setSource('local')

    if (!isSupabaseConfigured || submissions.length === 0 || !hackathon?.id) return undefined

    let cancelled = false
    setLoading(true)

    getGeminiJudging({
      hackathonId: hackathon.id,
      submissions: submissions.map((s) => ({
        id: s.id,
        project_title: s.project_title,
        description: s.description,
        tech_stack: s.tech_stack || [],
        repo_url: s.repo_url,
        demo_url: s.demo_url,
      })),
    })
      .then(({ results: scored, overall_verdict }) => {
        if (cancelled || !scored?.length) return
        setGeminiById(new Map(scored.map((r) => [String(r.id), r])))
        setVerdict(overall_verdict || '')
        setSource('gemini')
      })
      .catch(() => {
        // Not configured, offline, or the model call failed — local
        // results (already rendered) remain the source of truth.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathon?.id, idsKey])

  // Re-merge against the live `submissions` array on every render so status
  // changes (shortlist/winner/reject) always show up, whether we're in the
  // local-heuristic or Gemini-scored source.
  const results = useMemo(() => {
    if (source === 'gemini' && geminiById) {
      const merged = submissions
        .map((submission) => {
          const hit = geminiById.get(String(submission.id))
          if (!hit) return null
          return { submission, score: hit.score, reasons: hit.reasons }
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
      if (merged.length) return merged
    }
    return local
  }, [source, geminiById, submissions, local])

  return { results, verdict, source, loading }
}
