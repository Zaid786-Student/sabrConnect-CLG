// ---------------------------------------------------------------------------
// Shared AI scoring badges — originally lived inline in AIRecommendations.jsx,
// extracted here now that the organizer Judging tab reuses the same "is this
// local or live Gemini?" honesty pattern.
// ---------------------------------------------------------------------------
import { Sparkles, Zap, Loader2 } from 'lucide-react'

export function SourceBadge({
  source,
  loading,
  liveLabel = 'Live scoring by Gemini',
  localLabel = 'Personalized AI Recommendations',
}) {
  if (loading) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-bg-border bg-white/[0.03] px-3 py-1.5 text-xs text-white/40">
        <Loader2 size={12} className="animate-spin" /> Checking Gemini…
      </span>
    )
  }
  if (source === 'gemini') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-student/30 bg-student-soft px-3 py-1.5 text-xs font-medium text-student">
        <Zap size={12} /> {liveLabel}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-bg-border bg-white/[0.03] px-3 py-1.5 text-xs text-white/40">
      <Sparkles size={12} /> {localLabel}
    </span>
  )
}

export function ScorePill({ score, label = 'match' }) {
  const tone =
    score >= 75
      ? 'text-student border-student/30 bg-student-soft'
      : score >= 50
        ? 'text-volunteer border-volunteer/30 bg-volunteer-soft'
        : 'text-white/50 border-bg-border bg-white/[0.04]'
  return (
    <span className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      <Sparkles size={11} /> {score}% {label}
    </span>
  )
}
