// ---------------------------------------------------------------------------
// useAIRecommendations
// ---------------------------------------------------------------------------
// Renders instantly using the local scoring engine (src/lib/aiMatch.js), then
// — if Supabase + the gemini-recommend edge function are configured —
// silently re-scores using real Gemini output and swaps it in. If Gemini
// isn't configured or the call fails, the local results simply stay put.
// This keeps AI Recommendations demoable with zero setup while making the
// "AI" label true whenever Gemini is wired up.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react'
import { recommendHackathons, recommendInternships, recommendTeams } from './aiMatch'
import { getGeminiRecommendations } from './gemini'
import { isSupabaseConfigured } from './supabaseClient'

const CONFIG = {
  hackathons: {
    keyField: 'hackathon',
    localFn: recommendHackathons,
    toItems: (list) => list.map((h) => ({ id: h.id, title: h.title, tags: h.tags || [], detail: h.description || '' })),
  },
  internships: {
    keyField: 'internship',
    localFn: recommendInternships,
    toItems: (list) => list.map((i) => ({ id: i.id, title: i.title, tags: [], detail: `${i.company || ''} — ${i.requirements || i.description || ''}` })),
  },
  teams: {
    keyField: 'team',
    localFn: recommendTeams,
    toItems: (list) => list.map((t) => ({ id: t.id, title: t.team_name, tags: [...(t.skills || []), ...(t.rolesNeeded || [])], detail: t.description || '' })),
  },
}

export function useAIRecommendations(type, profile, list = []) {
  const { keyField, localFn, toItems } = CONFIG[type]

  const local = useMemo(() => localFn(profile, list), [localFn, profile, list])

  const [results, setResults] = useState(local)
  const [source, setSource] = useState('local')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setResults(local)
    setSource('local')

    if (!isSupabaseConfigured || list.length === 0) return undefined

    let cancelled = false
    setLoading(true)

    getGeminiRecommendations({ type, profile, items: toItems(list) })
      .then((scored) => {
        if (cancelled || !scored.length) return
        const byId = new Map(scored.map((r) => [String(r.id), r]))
        const merged = list
          .map((item) => {
            const hit = byId.get(String(item.id))
            if (!hit) return null
            return { [keyField]: item, score: hit.score, reasons: hit.reasons }
          })
          .filter(Boolean)
          .sort((a, b) => b.score - a.score)

        if (merged.length) {
          setResults(merged)
          setSource('gemini')
        }
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
  }, [type, list])

  return { results, source, loading }
}
