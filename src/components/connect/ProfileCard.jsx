import { Link } from 'react-router-dom'
import { UserPlus, UserCheck, UserMinus, MessageCircle, Clock, Check } from 'lucide-react'
import { Card } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { initials, availabilityTone } from '../../lib/utils'

export default function ProfileCard({
  profile,
  online,
  following,
  connectionStatus, // 'none' | 'pending_sent' | 'pending_received' | 'connected'
  onFollowToggle,
  onConnect,
  onAcceptConnect,
  onMessage,
}) {
  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex items-start gap-3">
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-student-soft text-sm font-semibold text-student">
          {initials(profile.full_name)}
          {online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-card bg-student" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{profile.full_name}</p>
          <p className="truncate text-xs text-white/40">{profile.college || 'SabrConnect member'}</p>
        </div>
        {profile.availability && (
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${availabilityTone(profile.availability)}`}>
            {profile.availability}
          </span>
        )}
      </div>

      {profile.bio && <p className="line-clamp-2 text-xs text-white/55">{profile.bio}</p>}

      <div className="flex flex-wrap gap-1.5">
        {[...(profile.skills || []), ...(profile.interests || [])].slice(0, 5).map((tag) => (
          <Badge key={tag} variant="student">{tag}</Badge>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Button
          variant={following ? 'outline' : 'primary'}
          className="flex-1 justify-center px-3 py-2 text-xs"
          onClick={onFollowToggle}
        >
          {following ? <UserMinus size={13} /> : <UserPlus size={13} />}
          {following ? 'Unfollow' : 'Follow'}
        </Button>

        {connectionStatus === 'connected' ? (
          <Button variant="outline" className="flex-1 justify-center px-3 py-2 text-xs" disabled>
            <Check size={13} /> Connected
          </Button>
        ) : connectionStatus === 'pending_sent' ? (
          <Button variant="outline" className="flex-1 justify-center px-3 py-2 text-xs" disabled>
            <Clock size={13} /> Requested
          </Button>
        ) : connectionStatus === 'pending_received' ? (
          <Button variant="outline" className="flex-1 justify-center px-3 py-2 text-xs" onClick={onAcceptConnect}>
            <UserCheck size={13} /> Accept
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
