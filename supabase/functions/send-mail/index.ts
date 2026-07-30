// ---------------------------------------------------------------------------
// send-mail — Supabase Edge Function
// ---------------------------------------------------------------------------
// Sends real email via Resend (https://resend.com) so recipients actually get
// something in their inbox — not just a row in the mail_log table.
//
// Setup:
//   1. Sign up at https://resend.com (free tier: 100 emails/day, 3,000/month)
//   2. Create an API key: Dashboard → API Keys → Create API Key
//   3. Deploy this function and set the key as a secret:
//        supabase functions deploy send-mail
//        supabase secrets set RESEND_API_KEY=re_your_key_here
//
// That's it — no domain verification required to start. Resend's shared
// "onboarding@resend.dev" sender works out of the box and can deliver to any
// real inbox. Once you verify your own domain in Resend (Dashboard →
// Domains), also set:
//        supabase secrets set MAIL_FROM="SabrConnect <hello@yourdomain.com>"
// so mail comes from your own address instead of Resend's shared one.
//
// Frontend calls this via supabase.functions.invoke('send-mail', ...) from
// src/context/data/NotificationsContext.jsx's sendMail(). If RESEND_API_KEY
// isn't set yet, this returns 501 and the frontend just falls back to
// logging into mail_log as before — so nothing breaks if you haven't set
// this up.
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const MAIL_FROM = Deno.env.get('MAIL_FROM') || 'SabrConnect <onboarding@resend.dev>'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY not configured — set it with `supabase secrets set RESEND_API_KEY=...`' }),
      { status: 501, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }

  try {
    const { to, toName, subject, body } = await req.json()

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: 'to, subject, and body are all required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // Plain-text body -> simple HTML paragraphs, so line breaks in the
    // message (e.g. "Congrats — your team is registered.\n\nSee you there!")
    // render as separate paragraphs instead of one run-on line.
    const html = `<div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; max-width: 480px;">
      <p>Hi ${toName || 'there'},</p>
      ${String(body)
        .split('\n')
        .filter(Boolean)
        .map((line: string) => `<p style="margin: 0 0 12px;">${line}</p>`)
        .join('')}
      <p style="color: #888; font-size: 13px; margin-top: 24px;">— SabrConnect</p>
    </div>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [to],
        subject,
        html,
      }),
    })

    const result = await resendRes.json()

    if (!resendRes.ok) {
      // eslint-disable-next-line no-console
      console.error('Resend send failed', result)
      return new Response(JSON.stringify({ error: result }), {
        status: resendRes.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
