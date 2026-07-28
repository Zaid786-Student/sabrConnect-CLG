// ---------------------------------------------------------------------------
// JudgingTab — AI Project Judging & Winner Assistant
// ---------------------------------------------------------------------------
// Rendered as a tab inside OrganizerEventDetail.jsx (hackathon events only).
// Scores render instantly from the local heuristic (src/lib/aiMatch.js —
// scoreSubmission) and silently upgrade to live Gemini scoring via
// useAIJudging when configured — same dual-layer pattern as the student
// AI Recommendations page. The AI only ever ranks and explains; marking a
// winner is always an explicit organizer action.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { Trophy, Github, ExternalLink, Video, Award, ThumbsDown, Bookmark, PenSquare } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input, { Field } from '../../components/ui/Input'
import { ScorePill, SourceBadge } from '../../components/ui/AIBadges'
import { useAIJudging } from '../../lib/useAIJudging'
import { formatDate } from '../../lib/utils'

const statusVariant = { submitted: 'info', shortlisted: 'warning', winner: 'success', rejected: 'neutral' }

export default function JudgingTab({ hackathon, submissions, teams, applications = [], setSubmissionStatus, setSubmissionOrganizerScore, setSubmissionAiScore }) {
  const judging = useAIJudging(hackathon, submissions)

  // Persist a Gemini scoring pass back onto the submission record so it
  // survives reloads and shows up anywhere else the submission is read from
  // — not just this session's hook state. Guarded so it only writes once per
  // submission per score (see useAIJudging's idsKey dependency for why this
  // doesn't loop).
  useEffect(() => {
    if (judging.source !== 'gemini') return
    judging.results.forEach(({ submission, score, reasons }) => {
      if (submission.ai_score !== score) setSubmissionAiScore(submission.id, { score, reasons })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [judging.source, judging.results])

  // Team submissions show the team name; solo submissions show the
  // registrant's own name, resolved from their application record.
  const submitterName = (submission) => {
    if (submission.team_id) return teams.find((t) => t.id === submission.team_id)?.team_name || 'Unknown team'
    const app = applications.find((a) => a.user_id === submission.user_id)
    return app?.user_name || 'Individual participant'
  }

  const top = judging.results[0]

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <SourceBadge source={judging.source} loading={judging.loading} />
      </div>

      {top && (
        <Card className="border-organizer/30 bg-organizer-soft/40">
          <div className="flex items-center gap-2 text-sm font-semibold text-organizer">
            <Trophy size={16} /> {judging.source === 'gemini' ? 'Recommended Winner' : 'Top scored (local)'}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-semibold">{top.submission.project_title}</h3>
            <ScorePill score={top.score} />
          </div>
          <p className="mt-0.5 text-xs text-white/40">{submitterName(top.submission)}</p>
          {judging.source === 'gemini' && judging.verdict ? (
            <p className="mt-3 text-sm text-white/70">{judging.verdict}</p>
          ) : (
            <p className="mt-3 text-sm text-white/50">
              Highest local heuristic score — connect Gemini for a reasoned verdict naming the strongest submission.
            </p>
          )}
        </Card>
      )}

      <div className="space-y-4">
        {judging.results.map(({ submission, score, reasons }) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            score={score}
            reasons={reasons}
            teamName={submitterName(submission)}
            setSubmissionStatus={setSubmissionStatus}
            setSubmissionOrganizerScore={setSubmissionOrganizerScore}
          />
        ))}
        {judging.results.length === 0 && (
          <p className="rounded-xl border border-dashed border-bg-border px-4 py-10 text-center text-sm text-white/30">
            No project submissions yet.
          </p>
        )}
      </div>
    </div>
  )
}

function SubmissionCard({ submission, score, reasons, teamName, setSubmissionStatus, setSubmissionOrganizerScore }) {
  const [showOverride, setShowOverride] = useState(false)
  const [override, setOverride] = useState({ score: submission.organizer_score ?? '', notes: submission.organizer_notes || '' })

  const saveOverride = (e) => {
    e.preventDefault()
    setSubmissionOrganizerScore(submission.id, { score: Math.max(0, Math.min(100, Number(override.score) || 0)), notes: override.notes })
    setShowOverride(false)
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold">{submission.project_title}</h3>
            <Badge variant={statusVariant[submission.status]} className="capitalize">{submission.status}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-white/40">{teamName} · submitted {formatDate(submission.submitted_at)}</p>
        </div>
        <ScorePill score={score} />
      </div>

      <p className="mt-3 text-sm text-white/60">{submission.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {reasons.map((r) => (
          <span key={r} className="rounded-full border border-bg-border px-2.5 py-1 text-[11px] text-white/50">{r}</span>
        ))}
      </div>

      {submission.tech_stack?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {submission.tech_stack.map((t) => (
            <span key={t} className="rounded-full border border-bg-border bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/40">{t}</span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/40">
        {submission.repo_url && (
          <a href={submission.repo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-student">
            <Github size={13} /> Repo
          </a>
        )}
        {submission.demo_url && (
          <a href={submission.demo_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-student">
            <ExternalLink size={13} /> Demo
          </a>
        )}
        {submission.video_url && (
          <a href={submission.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-student">
            <Video size={13} /> Video
          </a>
        )}
        {!submission.repo_url && !submission.demo_url && !submission.video_url && <span className="text-white/25">No links provided</span>}
      </div>

      {submission.organizer_score != null && (
        <p className="mt-3 text-xs text-white/40">
          Organizer score: <span className="text-white/70">{submission.organizer_score}</span>
          {submission.organizer_notes ? ` — ${submission.organizer_notes}` : ''}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-bg-border pt-4">
        <Button variant="outline" className="!py-1.5 text-xs" onClick={() => setSubmissionStatus(submission.id, 'shortlisted')} disabled={submission.status === 'shortlisted'}>
          <Bookmark size={13} /> Shortlist
        </Button>
        <Button
          variant="outline"
          className="!py-1.5 text-xs !border-student/40 !text-student hover:!bg-student-soft"
          onClick={() => setSubmissionStatus(submission.id, 'winner')}
          disabled={submission.status === 'winner'}
        >
          <Award size={13} /> Mark Winner
        </Button>
        <Button variant="ghost" className="!py-1.5 text-xs text-white/40 hover:text-red-400" onClick={() => setSubmissionStatus(submission.id, 'rejected')} disabled={submission.status === 'rejected'}>
          <ThumbsDown size={13} /> Reject
        </Button>
        <button onClick={() => setShowOverride((v) => !v)} className="ml-auto flex items-center gap-1.5 text-xs text-white/40 hover:text-white">
          <PenSquare size={13} /> {showOverride ? 'Close' : 'Override score'}
        </button>
      </div>

      {showOverride && (
        <form onSubmit={saveOverride} className="mt-3 grid gap-3 rounded-xl border border-bg-border bg-white/[0.02] p-4 sm:grid-cols-[120px_1fr_auto]">
          <Field label="Score (0-100)" htmlFor={`ov-score-${submission.id}`}>
            <Input
              id={`ov-score-${submission.id}`}
              type="number"
              min="0"
              max="100"
              value={override.score}
              onChange={(e) => setOverride((o) => ({ ...o, score: e.target.value }))}
            />
          </Field>
          <Field label="Notes" htmlFor={`ov-notes-${submission.id}`}>
            <Input
              id={`ov-notes-${submission.id}`}
              value={override.notes}
              onChange={(e) => setOverride((o) => ({ ...o, notes: e.target.value }))}
              placeholder="Judging notes..."
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="!py-2 text-xs">Save</Button>
          </div>
        </form>
      )}
    </Card>
  )
}
