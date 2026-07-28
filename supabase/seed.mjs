// One-time demo data seeder.
//
// Why this exists as a script instead of a SQL INSERT: `profiles.user_id`
// is a foreign key into `auth.users`, and Supabase's auth users can only be
// created through the Auth API (SQL can't hash passwords into that table
// directly). This script uses the *service role* key — which bypasses RLS
// and can call the Admin API — to create one ready-to-use organizer account
// plus a few hackathons/internships/announcements so the app isn't empty
// the first time you open it against a fresh Supabase project.
//
// This script is NOT part of the deployed app and must never ship to the
// browser — it's a local/CI-only tool. Never put SUPABASE_SERVICE_ROLE_KEY
// in your .env file that Vite reads (anything prefixed VITE_ is bundled
// into client code); keep it only in your shell/CI secrets.
//
// Usage:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node supabase/seed.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing env vars. Run with:\n' +
      '  SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node supabase/seed.mjs\n\n' +
      'Find both in your Supabase project: Settings -> API.\n' +
      '(SUPABASE_SERVICE_ROLE_KEY is the "service_role" secret, NOT the anon key.)',
  )
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DEMO_ORGANIZER = {
  email: 'organizer@sabrconnect.dev',
  password: 'SabrDemo123!',
  fullName: 'Demo Organizer',
}

async function getOrCreateOrganizer() {
  // Admin listUsers doesn't filter by email server-side in older SDKs, so
  // page through the (small) demo list and match by hand.
  const { data: existingList } = await admin.auth.admin.listUsers()
  const existingAuthUser = existingList?.users?.find((u) => u.email === DEMO_ORGANIZER.email)

  const authUser =
    existingAuthUser ||
    (
      await admin.auth.admin.createUser({
        email: DEMO_ORGANIZER.email,
        password: DEMO_ORGANIZER.password,
        email_confirm: true,
      })
    ).data.user

  if (!authUser) throw new Error('Could not create or find the demo organizer auth user.')

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('*')
    .eq('user_id', authUser.id)
    .maybeSingle()

  if (existingProfile) return existingProfile

  const { data: profile, error } = await admin
    .from('profiles')
    .insert({
      user_id: authUser.id,
      full_name: DEMO_ORGANIZER.fullName,
      role: 'organizer',
      status: 'approved',
      bio: 'Runs campus hackathons and internship programs on SabrConnect.',
    })
    .select()
    .single()

  if (error) throw error
  return profile
}

async function seedHackathons(organizer) {
  const { count } = await admin.from('hackathons').select('*', { count: 'exact', head: true })
  if (count > 0) {
    console.log(`Skipping hackathons — ${count} already exist.`)
    return
  }

  const today = new Date()
  const inDays = (n) => new Date(today.getTime() + n * 86400000).toISOString().slice(0, 10)

  const { error } = await admin.from('hackathons').insert([
    {
      title: 'AI for Good Hackathon',
      description: 'Build a project that uses AI to address a real community problem, in 36 hours.',
      organizer_id: organizer.id,
      organizer_name: organizer.full_name,
      start_date: inDays(14),
      end_date: inDays(16),
      registration_deadline: inDays(10),
      status: 'open',
      tags: ['AI', 'Social Impact', 'Beginner Friendly'],
      location: 'Campus Innovation Lab',
      prize: '$2,000 total prize pool',
    },
    {
      title: 'Campus FinTech Sprint',
      description: 'A weekend sprint building financial tools for students — budgeting, micro-savings, split expenses.',
      organizer_id: organizer.id,
      organizer_name: organizer.full_name,
      start_date: inDays(30),
      end_date: inDays(31),
      registration_deadline: inDays(25),
      status: 'upcoming',
      tags: ['FinTech', 'Web'],
      location: 'Online',
      prize: '$1,000 total prize pool',
    },
  ])
  if (error) throw error
  console.log('Seeded 2 demo hackathons.')
}

async function seedInternships(organizer) {
  const { count } = await admin.from('internships').select('*', { count: 'exact', head: true })
  if (count > 0) {
    console.log(`Skipping internships — ${count} already exist.`)
    return
  }

  const { error } = await admin.from('internships').insert([
    {
      title: 'Frontend Engineering Intern',
      company: 'SabrConnect Labs',
      description: 'Work directly with the founding team shipping new features for the SabrConnect platform.',
      organizer_id: organizer.id,
      organizer_name: organizer.full_name,
      deadline: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
      status: 'open',
      location: 'Remote',
      stipend: '$1,200/month',
      duration: '3 months',
      responsibilities: 'Build and ship UI features in React, collaborate with design on new flows.',
      requirements: 'Comfortable with React and Git; no prior internship experience required.',
    },
  ])
  if (error) throw error
  console.log('Seeded 1 demo internship.')
}

async function seedAnnouncement(organizer) {
  const { count } = await admin.from('announcements').select('*', { count: 'exact', head: true })
  if (count > 0) {
    console.log(`Skipping announcements — ${count} already exist.`)
    return
  }
  const { error } = await admin.from('announcements').insert({
    organizer_id: organizer.id,
    organizer_name: organizer.full_name,
    title: 'Welcome to SabrConnect 👋',
    content: 'This platform is now live with real-time backend support. Explore hackathons, internships, and start building your team.',
    audience: 'All',
  })
  if (error) throw error
  console.log('Seeded 1 welcome announcement.')
}

async function main() {
  console.log(`Seeding demo data into ${SUPABASE_URL} ...`)
  const organizer = await getOrCreateOrganizer()
  console.log(`Demo organizer ready: ${DEMO_ORGANIZER.email} / ${DEMO_ORGANIZER.password}`)
  await seedHackathons(organizer)
  await seedInternships(organizer)
  await seedAnnouncement(organizer)
  console.log('\nDone. Sign in with the demo organizer above, or sign up as a student/volunteer to test the approval flow.')
}

main().catch((err) => {
  console.error('Seeding failed:', err.message || err)
  process.exit(1)
})
