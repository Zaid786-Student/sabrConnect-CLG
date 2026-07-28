import { UserCheck, Check, Clock, MessageCircle, Sparkles } from 'lucide-react'
import { Card } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { initials, availabilityTone } from '../../lib/utils'

function scoreTone(score) {
  if (score >= 75) return 'text-student border-student/30 bg-student-soft'
  if (score >= 50) return 'text-volunteer border-volunteer/30 bg-volunteer-soft'
  return 'text-white/50 border-bg-border bg-white/[0.04]'
}

export default function MatchCard({
  match, // { profile, score, sharedInterests, sharedSkills, isComplementaryRole, candidateRole }
  connectionStatus, // 'none' | 'pending_sent' | 'pending_received' | 'connected'
  onConnect,
  onMessage,
}) {
  const { profile, score, sharedInterests = [], sharedSkills = [], isComplementaryRole, candidateRole } = match

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-student-soft text-sm font-semibold text-student">
          {initials(profile.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{profile.full_name}</p>
          <p className="truncate text-xs text-white/40">{candidateRole || profile.college || 'SabrConnect member'}</p>
        </div>
        <span className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${scoreTone(score)}`}>
          <Sparkles size={11} /> {score}%
        </span>
      </div>

      {isComplementaryRole && (
        <Badge variant="student" className="w-fit">
          Complements your role
        </Badge>
      )}

      {profile.bio && <p className="line-clamp-2 text-xs text-white/55">{profile.bio}</p>}

      {sharedInterests.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-white/30">Shared interests</p>
          <div className="flex flex-wrap gap-1.5">
            {sharedInterests.map((tag) => (
              <Badge key={tag} variant="volunteer">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {sharedSkills.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-wide text-white/30">Skill overlap</p>
          <div className="flex flex-wrap gap-1.5">
            {sharedSkills.map((tag) => (
              <Badge key={tag} variant="neutral">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {profile.availability && (
        <span className={`w-fit rounded-full border px-2 py-0.5 text-[10px] font-medium ${availabilityTone(profile.availability)}`}>
          {profile.availability}
        </span>
      )}

      <div className="mt-auto flex gap-2 pt-1">
        {connectionStatus === 'connected' ? (
          <Button variant="outline" className="flex-1 justify-center px-3 py-2 text-xs" disabled>
            <Check size={13} /> Connected
          </Button>
        ) : connectionStatus === 'pending_sent' ? (
          <Button variant="outline" className="flex-1 justify-center px-3 py-2 text-xs" disabled>
            <Clock size={13} /> Requested
          </Button>
        ) : (
          <Button variant="outline" className="flex-1 justify-center px-3 py-2 text-xs" onClick={onConnect}>
            <UserCheck size={13} /> Connect
          </Button>
        )}
        <Button variant="ghost" className="justify-center px-3 py-2 text-xs" onClick={onMessage} title="Message">
          <MessageCircle size={14} />
        </Button>
      </div>
    </Card>
  )
}
