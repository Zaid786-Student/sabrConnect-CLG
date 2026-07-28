// ---------------------------------------------------------------------------
// gemini-recommend — Supabase Edge Function
// ---------------------------------------------------------------------------
// Proxies AI Recommendations requests to Google's Gemini API so the API key
// never touches the browser. Deploy with:
//
//   supabase functions deploy gemini-recommend
//   supabase secrets set GEMINI_API_KEY=your-gemini-api-key
//
// Frontend calls this via supabase.functions.invoke('gemini-recommend', ...)
// from src/lib/gemini.js. If the secret isn't set, this function returns a
// 501 and the frontend silently falls back to the local scoring engine in
// src/lib/aiMatch.js — so the app still runs with zero setup for demos.
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Latest fast/cost-efficient Gemini model. Override with GEMINI_MODEL secret
// if you want to point at a different Gemini model without redeploying code.
const MODEL_ID = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

// Aborts the upstream call if Gemini hasn't responded in time, so a slow or
// hung model call can never hang the edge function (and, in turn, the
// caller's UI, which is designed to fall back to local scoring on failure).
const REQUEST_TIMEOUT_MS = 25_000

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    results: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          score: { type: 'INTEGER' },
          reasons: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['id', 'score', 'reasons'],
      },
    },
  },
  required: ['results'],
}

function buildPrompt(type: string, profile: Record<string, unknown>, items: Array<Record<string, unknown>>) {
  const skills = (profile.skills as string[]) || []
  const interests = (profile.interests as string[]) || []

  const candidateLines = items
    .map((it) => `- id: ${it.id} | title: ${it.title} | tags/skills: ${(it.tags || []).join(', ') || 'none'} | detail: ${String(it.detail || '').slice(0, 220)}`)
    .join('\n')

  return `You are the recommendation engine inside a student opportunity platform. Rank ${type} for this student.

Student skills: ${skills.join(', ') || 'none listed'}
Student interests: ${interests.join(', ') || 'none listed'}

Candidates:
${candidateLines}

Score every candidate 0-100 reflecting fit. Reasons must be short (under 8 words), specific to the student's skills/interests, and grounded in the candidate details given.`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY')

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'gemini not configured' }), {
      status: 501,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let type: string, profile: Record<string, unknown>, items: Array<Record<string, unknown>>
  try {
    const body = await req.json()
    type = body?.type
    profile = body?.profile
    items = body?.items
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (!Array.isArray(items) || items.length === 0) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const trimmedItems = items.slice(0, 12) // keep prompt small & fast
  const prompt = buildPrompt(type, profile ?? {}, trimmedItems)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const genRes = await fetch(
      `${GEMINI_API_BASE}/models/${MODEL_ID}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          // Header (not query string) so the key never lands in access logs.
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      },
    )

    if (!genRes.ok) {
      const detail = await genRes.text()
      throw new Error(`Gemini generation failed: ${genRes.status} ${detail}`)
    }

    const genData = await genRes.json()
    const text: string = genData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) throw new Error('Empty response from Gemini')

    const parsed = JSON.parse(text)

    const validIds = new Set(trimmedItems.map((it) => String(it.id)))
    const results = (Array.isArray(parsed.results) ? parsed.results : [])
      .filter((r: any) => r && validIds.has(String(r.id)))
      .map((r: any) => ({
        id: String(r.id),
        score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
        reasons: Array.isArray(r.reasons) && r.reasons.length ? r.reasons.slice(0, 3).map(String) : ['Recommended by Gemini'],
      }))

    return new Response(JSON.stringify({ results, model: MODEL_ID }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'AbortError'
    return new Response(
      JSON.stringify({ error: timedOut ? 'Gemini request timed out' : String(err) }),
      {
        status: timedOut ? 504 : 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    )
  } finally {
    clearTimeout(timeout)
  }
})
