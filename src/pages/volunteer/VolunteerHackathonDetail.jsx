import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin, Trophy, Users2, CheckCircle2, ListChecks } from 'lucide-react'
import DashboardShell from '../../components/layout/DashboardShell'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import NoticeList from '../../components/dashboard/NoticeList'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatDate } from '../../lib/utils'

const statusVariant = { pending: 'warning', in_progress: 'info', completed: 'success' }

export default function VolunteerHackathonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { hackathons, volunteerTasks, getVolunteerSignup, volunteerSignUp } = useData()

  const hackathon = hackathons.find((h) => h.id === id)
  const mySignup = getVolunteerSignup(user?.id, id)
  const isApproved = mySignup?.status === 'accepted'
  const isPending = mySignup?.status === 'pending'
  const myTasks = volunteerTasks.filter((t) => t.event_id === id && t.volunteer_id === user?.id)

  if (!hackathon) {
    return (
      <DashboardShell role="volunteer" title="Event not found" subtitle="This hackathon may have been removed.">
        <Link to="/dashboard/volunteer/hackathons" className="text-sm text-white/50 hover:text-white">
          ← Back to Find Hackathons
        </Link>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell role="volunteer" title={hackathon.title} subtitle={hackathon.organizer_name}>
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm text-white/45 hover:text-white"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="organizer" className="capitalize">{hackathon.status}</Badge>
              {isApproved && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 size={12} /> You're volunteering
                </Badge>
              )}
              {isPending && (
                <Badge variant="warning" className="flex items-center gap-1">
                  Request pending approval
                </Badge>
              )}
              <span className="flex items-center gap-1 text-xs text-white/40">
                <Users2 size={12} /> {hackathon.participants} participants
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/60">{hackathon.description}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <CalendarDays size={15} className="text-volunteer" />
                {formatDate(hackathon.start_date)} – {formatDate(hackathon.end_date)}
              </div>
              {hackathon.location && (
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <MapPin size={15} className="text-volunteer" /> {hackathon.location}
                </div>
              )}
              {hackathon.prize && (
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Trophy size={15} className="text-volunteer" /> {hackathon.prize}
                </div>
              )}
            </div>
          </Card>

          {hackathon.rules && (
            <Card>
              <h2 className="mb-3 font-display text-base font-semibold">Rules & Guidelines</h2>
              <p className="text-sm leading-relaxed text-white/55">{hackathon.rules}</p>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 font-display text-base font-semibold">Notices & Updates</h2>
            <NoticeList notices={hackathon.notices} accent="volunteer" />
          </Card>

          {myTasks.length > 0 && (
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <ListChecks size={16} className="text-volunteer" />
                <h2 className="font-display text-base font-semibold">Your Tasks for this Event</h2>
              </div>
              <div className="space-y-3">
                {myTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-bg-border bg-white/[0.02] px-4 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="mt-0.5 text-xs text-white/40">Due {formatDate(t.deadline)}</p>
                    </div>
                    <Badge variant={statusVariant[t.status]}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div>
          <Card className="lg:sticky lg:top-24">
            {isApproved ? (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-volunteer" />
                  <h2 className="font-display text-base font-semibold">You're on the team</h2>
                </div>
                <p className="text-sm text-white/50">
                  Organizers can now assign you tasks for this event from the Task Board.
                </p>
                <Button variant="outline" as={Link} to="/dashboard/volunteer/tasks" className="mt-5 w-full">
                  Go to Task Board
                </Button>
              </div>
            ) : isPending ? (
              <div>
                <h2 className="mb-3 font-display text-base font-semibold">Request sent</h2>
                <p className="text-sm text-white/50">
                  Your request to volunteer is waiting on approval from the organizing team. You'll get an email
                  and a notification the moment it's confirmed.
                </p>
              </div>
            ) : (
              <div>
                <h2 className="mb-3 font-display text-base font-semibold">Volunteer for this event</h2>
                <p className="mb-5 text-sm text-white/50">
                  Sign up and the organizing team will review your request before confirming your spot.
                </p>
                <Button className="w-full" onClick={() => volunteerSignUp(hackathon, user)}>
                  Request to Volunteer
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
