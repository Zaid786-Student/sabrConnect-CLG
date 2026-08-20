import { Trash2 } from 'lucide-react'
import ExpandableText from '../ui/ExpandableText'

// SIH-style problem statement table — shared by the organizer's "Problem
// Statements" tab (with a delete action) and the student hackathon detail
// page (read-only). Description is clamped with a "See More" toggle so a
// long paragraph doesn't blow out every row's height.
export default function ProblemStatementTable({
  statements = [],
  onDelete,
  accent = 'student',
  emptyText = 'No problem statements published yet — check back closer to the event.',
}) {
  if (!statements.length) {
    return (
      <p className="rounded-xl border border-dashed border-bg-border px-4 py-6 text-center text-xs text-white/30">
        {emptyText}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-bg-border text-xs uppercase tracking-wide text-white/35">
            <th className="py-2.5 pr-4 font-medium">PS No.</th>
            <th className="py-2.5 pr-4 font-medium">Title</th>
            <th className="py-2.5 pr-4 font-medium">Category</th>
            <th className="py-2.5 font-medium">Description</th>
            {onDelete && <th className="py-2.5 pl-4 font-medium text-right">Action</th>}
          </tr>
        </thead>
        <tbody>
          {statements.map((s) => (
            <tr key={s.id} className="border-b border-bg-border last:border-0 align-top">
              <td className="py-3 pr-4 whitespace-nowrap font-medium text-white/80">{s.ps_number || '—'}</td>
              <td className="py-3 pr-4 font-medium">{s.title}</td>
              <td className="py-3 pr-4 text-white/60">{s.category || '—'}</td>
              <td className="py-3 min-w-[220px] max-w-sm text-white/60">
                {s.description ? (
                  <ExpandableText
                    text={s.description}
                    lines={2}
                    accent={accent}
                    textClassName="text-sm text-white/60"
                  />
                ) : (
                  '—'
                )}
              </td>
              {onDelete && (
                <td className="py-3 pl-4 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(s.id)}
                    className="text-white/30 hover:text-red-400"
                    aria-label="Remove problem statement"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
