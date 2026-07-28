# SabrConnect

**Connect. Collaborate. Compete.**

A unified innovation ecosystem connecting **Students**, **Volunteers**, and **Organizers** through hackathons, internships, and collaborative programs — built from the SabrConnect PRD (IBM Submission).

## ✨ What's included

- Marketing landing page (hero, role showcase, feature bento grid, opportunity previews, community activity feed)
- Single authentication flow with role selection (Sign Up, Sign In, Password Reset)
- Three role-based dashboards, each with their own sub-pages:
  - **Student** — Overview, Hackathons, Internships, My Teams, Applications
  - **Volunteer** — Overview, Task Board, Assigned Events, Announcements
  - **Organizer** — Overview, Events, Participant Management, Volunteer Management, Announcements, Analytics
- Premium dark theme with role accent colors, exactly as specified in the PRD's Visual Identity section
- A ready-to-run **local mock backend** (no setup required) *and* a drop-in **Supabase** integration path with a matching SQL schema

## 🚀 Quick start

```bash
npm install
npm run dev
```

Open the printed local URL. The app runs immediately using an in-memory/localStorage mock backend — sign up with any email/password, or use the **Preview a dashboard** shortcuts on the Sign In page to jump straight into a demo Student, Volunteer, or Organizer account.

## 🔌 Connecting real Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor — it creates every table the app needs (profiles, hackathons, internships, teams + team workspace tables, applications, volunteer tasks/signups, announcements, submissions, notifications, follows/connections/messages, posts), with row-level security policies on every table and every table added to the `supabase_realtime` publication.
3. Copy `.env.example` to `.env` and fill in your project's URL and anon key:
   ```bash
   cp .env.example .env
   ```
4. Restart `npm run dev`. `src/lib/supabaseClient.js` auto-detects the env vars — once present, every module under `src/context/data/` switches from the localStorage mock layer to real Supabase queries **and** subscribes to Supabase Realtime for live updates, with no other code changes needed.
5. (Optional) Seed a demo organizer account + starter hackathons/internships/announcement so the app isn't empty:
   ```bash
   SUPABASE_URL=https://xxxx.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Settings -> API -> service_role secret, NEVER the anon key
   node supabase/seed.mjs
   ```
   This creates `organizer@sabrconnect.dev` / `SabrDemo123!`. The service role key bypasses RLS and can call the Auth Admin API (needed to create a real `auth.users` row) — keep it out of `.env`/git; only export it in your shell when running this script.

### Before you deploy

Run the local checks that don't need your Supabase credentials:
```bash
bash scripts/predeploy-check.sh
```
This installs deps, builds the production bundle, and tells you whether `.env` is set. It won't create your Supabase project or deploy anywhere — those need your own accounts:

1. Run `supabase/schema.sql` in your Supabase project's SQL editor.
2. `node supabase/seed.mjs` (see step 5 above) to add demo data.
3. Push this repo to GitHub and import it on [Vercel](https://vercel.com) or [Netlify](https://netlify.com) — both configs (`vercel.json` / `netlify.toml`) are already set up with SPA rewrites so React Router routes work on refresh. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the host's dashboard (never commit them).
4. Add your production domain to Supabase → Authentication → URL Configuration, or sign-in will silently fail on the deployed site.

### Data layer architecture

The data layer is split into eight independent modules under `src/context/data/`, each owning one domain, its own Supabase queries, and its own Realtime subscription:

```
src/context/data/
├── NotificationsContext.jsx   # notifications + simulated mail log
├── OpportunitiesContext.jsx   # hackathons, internships, notices
├── ApplicationsContext.jsx    # student/team applications
├── TeamsContext.jsx           # teams, members, join requests, team workspace
├── VolunteerContext.jsx       # volunteer tasks + hackathon volunteer signups
├── AnnouncementsContext.jsx   # organizer announcements
├── SubmissionsContext.jsx     # project submissions / judging
├── SocialContext.jsx          # follows, connections, DMs, opportunity feed
└── DataProvider.jsx            # composes all eight + wires cross-module calls
```

Each module exports both a granular hook (`useTeams()`, `useSocial()`, ...) for new code, and is merged into the legacy combined `useData()` hook (still exported from `src/context/DataContext.jsx`) so every existing page keeps working unchanged. Every module works two ways automatically, based on `isSupabaseConfigured`:

- **No `.env` configured:** reads/writes a per-module localStorage key, kept in sync across browser tabs via the native `storage` event (see `src/lib/localStore.js`) — the original zero-setup demo behavior, unchanged.
- **Supabase configured:** reads/writes the matching Supabase table and subscribes to `postgres_changes` via Supabase Realtime (see `subscribeTable`/`applyRealtimeChange` in `src/lib/supabaseClient.js`), so changes from any user/tab/device appear live without a refresh.

## 🧠 Connecting real AI (Google Gemini)

The **AI Recommendations** page (`src/pages/student/AIRecommendations.jsx`) and the organizer **Judging** tab (`src/pages/organizer/Judging.jsx`, inside an event's detail page) both run on local, explainable scoring engines (`src/lib/aiMatch.js`) out of the box, so they work with zero setup. To upgrade both to live model calls:

1. Deploy the included edge functions, which proxy requests to the Gemini API so your API key never reaches the browser:
   ```bash
   supabase functions deploy gemini-recommend
   supabase functions deploy gemini-judge
   ```
2. Set your Gemini API key as a function secret (see `.env.example` for details): `GEMINI_API_KEY`. No new secrets are needed beyond what's already documented — both functions share the same key.
3. That's it — `useAIRecommendations` (`src/lib/useAIRecommendations.js`) and `useAIJudging` (`src/lib/useAIJudging.js`) automatically detect their edge functions and switch from local scoring to live Gemini scoring, shown with a "Live scoring by Gemini" badge. If a call ever fails (offline, quota, misconfiguration), it silently falls back to local scoring — the app never breaks.

## 📁 Project structure

```
sabrconnect/
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
├── .env.example
├── supabase/
│   └── schema.sql              # Full Postgres schema + RLS policies
└── src/
    ├── main.jsx                 # App entry, router + auth provider
    ├── App.jsx                  # Route table
    ├── index.css                 # Design tokens & Tailwind layers
    │
    ├── context/
    │   └── AuthContext.jsx      # Sign up/in/out, session, mock<->Supabase switch
    │
    ├── lib/
    │   ├── supabaseClient.js    # Supabase client (activates via .env)
    │   ├── gemini.js             # Thin client calling the gemini-* edge functions
    │   └── utils.js             # cn(), formatDate(), role theme tokens
    │
    ├── data/
    │   └── mockData.js          # Seed data mirroring the Supabase schema
    │
    ├── routes/
    │   └── ProtectedRoute.jsx   # Auth + role guard for /dashboard/:role
    │
    ├── components/
    │   ├── ui/                  # Button, Card, Badge, Input, RoleSelect
    │   ├── layout/               # Navbar, Footer, Sidebar, Topbar, DashboardShell
    │   └── landing/               # Hero, RoleShowcase, FeatureShowcase, etc.
    │
    └── pages/
        ├── LandingPage.jsx
        ├── NotFound.jsx
        ├── auth/                 # SignIn, SignUp, ForgotPassword, AuthLayout
        ├── student/               # StudentDashboard, Hackathons, Internships, Teams, Applications
        ├── volunteer/             # VolunteerDashboard, TaskBoard, AssignedEvents, Announcements
        └── organizer/             # OrganizerDashboard, Events, Participants, Volunteers, Announcements, Analytics
```

## 🧠 AI Recommendations & Judging (Google Gemini)

The **AI Recommendations** page (Student → AI Recommendations) and the organizer **Judging** tab (Organizer → an event → Judging) are both powered by
Google's Gemini API, not just a client-side heuristic:

1. Results render **instantly** using a local, explainable scoring
   engine (`src/lib/aiMatch.js`) — skill/interest overlap, deadlines, open
   slots for recommendations; submission completeness, description substance,
   and tech-stack overlap for judging — so neither page is ever blank while
   waiting on a network call.
2. In the background, `src/lib/useAIRecommendations.js` and
   `src/lib/useAIJudging.js` call their respective Supabase Edge Functions
   (`supabase/functions/gemini-recommend` and `supabase/functions/gemini-judge`),
   which call the **Gemini API** (`gemini-2.5-flash` by default) directly
   from the Deno runtime with structured JSON output, and return scored,
   reasoned results — judging also returns an `overall_verdict` naming the
   strongest submission for the "Recommended Winner" panel.
3. If that call succeeds, the UI swaps in the live results and shows a
   **"Live scoring by Gemini"** badge. If Gemini isn't configured yet, or the
   call fails for any reason (including a timeout), the local results simply
   stay on screen — the app is always demoable with zero setup.

Marking a winner is always an explicit organizer action — the AI ranks
submissions and explains its reasoning, but it never finalizes a winner on
its own.

The Gemini API key never reaches the browser — it's stored as a Supabase Edge
Function secret, not a `VITE_*` env var.

**To activate live Gemini scoring:**

```bash
# 1. Requires Supabase already configured (see below) + the Supabase CLI
supabase functions deploy gemini-recommend
supabase functions deploy gemini-judge

# 2. Set this as a function secret (never in .env — it would ship to the browser)
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
# Optional — defaults to gemini-2.5-flash
supabase secrets set GEMINI_MODEL=gemini-2.5-flash
```

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

## 🎨 Design system

| Token | Value |
| --- | --- |
| Background | `#09090B` |
| Card Background | `#18181B` |
| Student accent | `#10B981` |
| Volunteer accent | `#0EA5E9` |
| Organizer accent | `#F59E0B` |
| Display font | Space Grotesk |
| Body font | Inter |

All defined centrally in `tailwind.config.js` and `src/index.css` — change a token once and it propagates everywhere.

## 🛠 Tech stack

- **Frontend:** React 18, React Router, Tailwind CSS
- **Charts:** Recharts (Organizer Analytics)
- **Icons:** lucide-react
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime) — schema included, mock layer included for zero-setup demos
- **Deployment target:** Vercel (frontend) + Supabase Cloud (backend), per the PRD

## 📦 Build for production

```bash
npm run build
npm run preview
```

## Roadmap (per PRD)

- **Phase 2:** AI team matching, smart recommendations, resume builder
- **Phase 3:** Community forums, certificate generation, event analytics, org profiles
- **Phase 4:** Mobile app, real-time collaboration tools, advanced reporting
