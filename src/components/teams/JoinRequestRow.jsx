import { Check, X } from 'lucide-react'
import { formatDate } from '../../lib/utils'
import Badge from '../ui/Badge'

const statusVariant = { pending: 'warning', accepted: 'success', rejected: 'neutral' }

export default function JoinRequestRow({ request, onApprove, onReject, readOnly }) {
  return (
    <div className="rounded-xl border border-bg-border bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/85">{request.user_name}</p>
          <p className="text-xs text-white/40">{request.role} · requested {formatDate(request.created_at)}</p>
        </div>
        <Badge variant={statusVariant[request.status] || 'neutral'} className="shrink-0 capitalize">{request.status}</Badge>
      </div>

      {request.skills?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {request.skills.map((s) => (
            <span key={s} className="rounded-full border border-bg-border px-2.5 py-1 text-xs text-white/45">{s}</span>
          ))}
        </div>
      )}

      {request.message && <p className="mt-2 text-xs text-white/50">“{request.message}”</p>}

      {!readOnly && request.status === 'pending' && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={onApprove}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-student py-2 text-xs font-semibold text-black hover:brightness-110"
          >
            <Check size={13} /> Approve
          </button>
          <button
            onClick={onReject}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-bg-border py-2 text-xs font-medium text-white/60 hover:text-white"
          >
            <X size={13} /> Reject
          </button>
        </div>
      )}
    </div>
  )
}
