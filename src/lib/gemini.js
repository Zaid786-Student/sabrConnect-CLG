// ---------------------------------------------------------------------------
// Gemini client (thin)
// ---------------------------------------------------------------------------
// Calls the `gemini-recommend` / `gemini-judge` Supabase Edge Functions,
// which proxy to Google's Gemini API — the API key stays server-side, never
// in the browser bundle. This only works once:
//   1. Supabase is configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
//   2. The edge functions are deployed with GEMINI_API_KEY set as a function
//      secret (see supabase/functions/gemini-recommend and gemini-judge)
//
// If either of those isn't true, every call here throws, and callers (see
// src/lib/useAIRecommendations.js) fall back to the local scoring engine in
// src/lib/aiMatch.js. That fallback is what keeps the app fully demoable
// with zero setup.
// ---------------------------------------------------------------------------
import { supabase, isSupabaseConfigured } from './supabaseClient'

export async function getGeminiRecommendations({ type, profile, items }) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured — Gemini proxy unavailable')

  const { data, error } = await supabase.functions.invoke('gemini-recommend', {
    body: { type, profile, items },
  })

  if (error) throw error
  if (!data || data.error) throw new Error(data?.error || 'Gemini returned no data')
  if (!Array.isArray(data.results)) throw new Error('Malformed Gemini response')

  return data.results // [{ id, score, reasons }]
}

// Proxies to the `gemini-judge` edge function for the organizer AI Judging
// tab — same fallback contract as getGeminiRecommendations: throws on any
// failure/misconfiguration so the caller (useAIJudging) falls back silently
// to the local scoring engine in src/lib/aiMatch.js (scoreSubmission).
export async function getGeminiJudging({ hackathonId, submissions }) {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured — Gemini proxy unavailable')

  const { data, error } = await supabase.functions.invoke('gemini-judge', {
    body: { hackathonId, submissions },
  })

  if (error) throw error
  if (!data || data.error) throw new Error(data?.error || 'Gemini returned no data')
  if (!Array.isArray(data.results)) throw new Error('Malformed Gemini response')

  return { results: data.results, overall_verdict: data.overall_verdict || '', model: data.model } // { id, score, reasons }[]
}
