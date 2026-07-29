import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card, StatCard } from '../../components/ui/Card'
import { Users, Trophy, ClipboardCheck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'

function monthKey(dateString) {
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export default function Analytics() {
  const { user } = useAuth()
  const { hackathons, internships, applications } = useData()

  const myHackathons = hackathons.filter((h) => h.organizer_id === user?.id)
  const myInternships = internships.filter((i) => i.organizer_id === user?.id)
  const myEvents = [...myHackathons, ...myInternships]
  const myEventIds = new Set(myEvents.map((e) => e.id))
  const myApplications = applications.filter((a) => myEventIds.has(a.opportunity_id))

  const totalParticipants = myHackathons.reduce((sum, h) => sum + (h.participants || 0), 0)
  const liveEvents = myHackathons.filter((h) => h.status === 'open').length

  // Cumulative applications received over time, for this organizer's events only.
  // Recomputes automatically whenever a new participant applies.
  const sortedApps = [...myApplications].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  let running = 0
  const growthMap = new Map()
  sortedApps.forEach((a) => {
    const key = monthKey(a.created_at)
    if (!key) return
    running += 1
    growthMap.set(key, running)
  })
  const participantGrowth = Array.from(growthMap.entries()).map(([month, total]) => ({ month, total }))

  // Applications per event, scoped to this organizer, always current.
  const applicationsByEvent = myEvents
    .map((e) => ({
      name: e.title.length > 18 ? `${e.title.slice(0, 18)}…` : e.title,
      applications: myApplications.filter((a) => a.opportunity_id === e.id).length,
    }))
    .sort((a, b) => b.applications - a.applications)

  return (
    <DashboardShell role="organizer" title="Analytics" subtitle="Live engagement and performance across the events you created.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Participants" value={totalParticipants} icon={Users} accent="student" />
        <StatCard label="Live Events" value={liveEvents} icon={Trophy} accent="organizer" />
        <StatCard label="Applications Submitted" value={myApplications.length} icon={ClipboardCheck} accent="volunteer" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="mb-1 font-display text-lg font-semibold">Participant Growth</h2>
          <p className="mb-6 text-sm text-white/40">Cumulative applications received across your events</p>
          {participantGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={participantGrowth}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis dataKey="month" stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="total" stroke="#10B981" strokeWidth={2} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[260px] items-center justify-center text-sm text-white/25">
              No applications yet — this chart fills in as participants apply.
            </p>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-1 font-display text-lg font-semibold">Applications by Event</h2>
          <p className="mb-6 text-sm text-white/40">Live submission volume for your events</p>
          {applicationsByEvent.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={applicationsByEvent} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                <XAxis type="number" stroke="#71717A" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#71717A"
                  fontSize={11}
                  width={110}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ background: '#18181B', border: '1px solid #27272A', borderRadius: 12, fontSize: 12 }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="applications" fill="#F59E0B" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-[260px] items-center justify-center text-sm text-white/25">
              Publish an event to see applications roll in here.
            </p>
          )}
        </Card>
      </div>
    </DashboardShell>
  )
}
