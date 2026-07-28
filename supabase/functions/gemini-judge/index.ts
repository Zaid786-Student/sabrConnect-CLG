// ---------------------------------------------------------------------------
// gemini-judge — Supabase Edge Function
// ---------------------------------------------------------------------------
// Proxies AI Project Judging requests to Google's Gemini API so the API key
// never touches the browser. Deploy with:
//
//   supabase functions deploy gemini-judge
//   supabase secrets set GEMINI_API_KEY=your-gemini-api-key
//
// Frontend calls this via supabase.functions.invoke('gemini-judge', ...)
// from src/lib/gemini.js. If the secret isn't set, this function returns a
// 501 and the frontend silently falls back to the local scoring engine in
// src/lib/aiMatch.js (scoreSubmission) — so the Judging tab still works with
// zero setup for demos.
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
    overall_verdict: { type: 'STRING' },
  },
  required: ['results', 'overall_verdict'],
}

function buildPrompt(submissions: Array<Record<string, unknown>>) {
  const lines = submissions
    .map(
      (s) =>
        `- id: ${s.id} | title: ${s.project_title} | tech stack: ${(s.tech_stack as string[] || []).join(', ') || 'none listed'} | repo: ${s.repo_url || 'none'} | demo: ${s.demo_url || 'none'} | description: ${String(s.description || '').slice(0, 400)}`,
    )
    .join('\n')

  return `You are judging submissions for a hackathon. Score each submission 0-100 on innovation, technical execution, and completeness.

Submissions:
${lines}

Score every submission. Each reason must be short (under 12 words) and must reference something specific from that submission's description — no generic praise. The overall_verdict must be a 1-2 sentence summary naming the strongest submission and why.`
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

  let submissions: Array<Record<string, unknown>>
  try {
    const body = await req.json()
    submissions = body?.submissions
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (!Array.isArray(submissions) || submissions.length === 0) {
    return new Response(JSON.stringify({ results: [], overall_verdict: '' }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const trimmedSubmissions = submissions.slice(0, 20) // keep prompt small & fast
  const prompt = buildPrompt(trimmedSubmissions)

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

    const validIds = new Set(trimmedSubmissions.map((s) => String(s.id)))
    const results = (Array.isArray(parsed.results) ? parsed.results : [])
      .filter((r: any) => r && validIds.has(String(r.id)))
      .map((r: any) => ({
        id: String(r.id),
        score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
        reasons: Array.isArray(r.reasons) && r.reasons.length ? r.reasons.slice(0, 3).map(String) : ['Scored by Gemini'],
      }))

    return new Response(
      JSON.stringify({ results, overall_verdict: String(parsed.overall_verdict || ''), model: MODEL_ID }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
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
