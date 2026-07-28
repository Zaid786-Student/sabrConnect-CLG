import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Hero from '../components/landing/Hero'
import RoleShowcase from '../components/landing/RoleShowcase'
import FeatureShowcase from '../components/landing/FeatureShowcase'
import OpportunityPreview from '../components/landing/OpportunityPreview'
import ActivityFeed from '../components/landing/ActivityFeed'
import CtaSection from '../components/landing/CtaSection'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Navbar />
      <main>
        <Hero />
        <RoleShowcase />
        <FeatureShowcase />
        <OpportunityPreview />
        <ActivityFeed />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
