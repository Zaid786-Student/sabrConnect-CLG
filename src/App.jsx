import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import ForgotPassword from './pages/auth/ForgotPassword'
import AuthCallback from './pages/auth/AuthCallback'
import ProtectedRoute from './routes/ProtectedRoute'

import StudentDashboard from './pages/student/StudentDashboard'
import Hackathons from './pages/student/Hackathons'
import HackathonDetail from './pages/student/HackathonDetail'
import IndividualWorkspace from './pages/student/IndividualWorkspace'
import Internships from './pages/student/Internships'
import InternshipDetail from './pages/student/InternshipDetail'
import InternshipWorkspace from './pages/student/InternshipWorkspace'
import Teams from './pages/student/Teams'
import TeamWorkspace from './pages/student/TeamWorkspace'
import Applications from './pages/student/Applications'
import ConfirmMembership from './pages/student/ConfirmMembership'
import Connect from './pages/student/Connect'
import Messages from './pages/student/Messages'
import Feed from './pages/student/Feed'
import TeamMatcher from './pages/student/TeamMatcher'
import AIRecommendations from './pages/student/AIRecommendations'

import VolunteerDashboard from './pages/volunteer/VolunteerDashboard'
import TaskBoard from './pages/volunteer/TaskBoard'
import AssignedEvents from './pages/volunteer/AssignedEvents'
import ExploreHackathons from './pages/volunteer/ExploreHackathons'
import VolunteerHackathonDetail from './pages/volunteer/VolunteerHackathonDetail'
import VolunteerAnnouncements from './pages/volunteer/VolunteerAnnouncements'
import VolunteerOpportunityFeed from './pages/volunteer/OpportunityFeed'

import OrganizerDashboard from './pages/organizer/OrganizerDashboard'
import OrganizerEvents from './pages/organizer/OrganizerEvents'
import OrganizerEventDetail from './pages/organizer/OrganizerEventDetail'
import Participants from './pages/organizer/Participants'
import OrganizerAnnouncements from './pages/organizer/OrganizerAnnouncements'
import Analytics from './pages/organizer/Analytics'
import OrganizerOpportunityFeed from './pages/organizer/OpportunityFeed'

import ProfileSettings from './pages/ProfileSettings'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/dashboard/student" element={<ProtectedRoute role="student" />}>
        <Route index element={<StudentDashboard />} />
        <Route path="hackathons" element={<Hackathons />} />
        <Route path="hackathons/:id" element={<HackathonDetail />} />
        <Route path="hackathons/:id/workspace" element={<IndividualWorkspace />} />
        <Route path="internships" element={<Internships />} />
        <Route path="internships/:id" element={<InternshipDetail />} />
        <Route path="internships/:id/workspace" element={<InternshipWorkspace />} />
        <Route path="teams" element={<Teams />} />
        <Route path="teams/:id" element={<TeamWorkspace />} />
        <Route path="applications" element={<Applications />} />
        <Route path="confirm/:applicationId/:token" element={<ConfirmMembership />} />
        <Route path="connect" element={<Connect />} />
        <Route path="messages" element={<Messages />} />
        <Route path="feed" element={<Feed />} />
        <Route path="team-matcher" element={<TeamMatcher />} />
        <Route path="recommendations" element={<AIRecommendations />} />
      </Route>

      <Route path="/dashboard/volunteer" element={<ProtectedRoute role="volunteer" />}>
        <Route index element={<VolunteerDashboard />} />
        <Route path="tasks" element={<TaskBoard />} />
        <Route path="events" element={<AssignedEvents />} />
        <Route path="hackathons" element={<ExploreHackathons />} />
        <Route path="hackathons/:id" element={<VolunteerHackathonDetail />} />
        <Route path="announcements" element={<VolunteerAnnouncements />} />
        <Route path="feed" element={<VolunteerOpportunityFeed />} />
      </Route>

      <Route path="/dashboard/organizer" element={<ProtectedRoute role="organizer" />}>
        <Route index element={<OrganizerDashboard />} />
        <Route path="events" element={<OrganizerEvents />} />
        <Route path="events/:kind/:id" element={<OrganizerEventDetail />} />
        <Route path="participants" element={<Participants />} />
        <Route path="announcements" element={<OrganizerAnnouncements />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="feed" element={<OrganizerOpportunityFeed />} />
      </Route>

      <Route path="/profile" element={<ProtectedRoute />}>
        <Route index element={<ProfileSettings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
