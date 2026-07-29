import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

const accentClasses = {
  student: 'text-student',
  volunteer: 'text-volunteer',
  organizer: 'text-organizer',
}

const clampClasses = {
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
}

/**
 * Renders long free-text content clamped to a few lines by default, with a
 * "See More" / "See Less" toggle that only appears when the content actually
 * overflows the clamp. Each instance keeps its own expand/collapse state, so
 * multiple sections on the same page never affect one another.
 *
 * Preserves existing line breaks / paragraph spacing (`whitespace-pre-wrap`)
 * and wraps long words or URLs so content never overflows its container
 * (`break-words` + `overflow-wrap: anywhere`).
 */
export default function ExpandableText({ text, lines = 3, accent = 'student', className, textClassName }) {
  const [expanded, setExpanded] = useState(false)
  const [isClamped, setIsClamped] = useState(false)
  const ref = useRef(null)

  const checkClamped = () => {
    const el = ref.current
    if (!el) return
    setIsClamped(el.scrollHeight > el.clientHeight + 1)
  }

  // Measure before paint so the toggle never flashes in/out.
  useLayoutEffect(() => {
    if (!expanded) checkClamped()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, lines, expanded])

  useEffect(() => {
    if (expanded) return undefined
    window.addEventListener('resize', checkClamped)
    return () => window.removeEventListener('resize', checkClamped)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  if (!text) return null

  const accentText = accentClasses[accent] || accentClasses.student

  return (
    <div className={className}>
      <p
        ref={ref}
        className={cn(
          'whitespace-pre-wrap break-words [overflow-wrap:anywhere]',
          textClassName,
          !expanded && (clampClasses[lines] || 'line-clamp-3'),
        )}
      >
        {text}
      </p>
      {(isClamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn('mt-1.5 text-xs font-medium hover:underline', accentText)}
        >
          {expanded ? 'See Less' : 'See More'}
        </button>
      )}
    </div>
  )
}
