import { useState } from 'react'
import { Heart, MessageCircle, Share2, Trash2, Link as LinkIcon } from 'lucide-react'
import { Card } from '../ui/Card'
import Badge from '../ui/Badge'
import Input from '../ui/Input'
import { initials, formatDate, postTypeMeta } from '../../lib/utils'

export default function PostCard({ post, user, onLike, onComment, onShare, onDelete }) {
  const [commentText, setCommentText] = useState('')
  const [showComments, setShowComments] = useState(false)
  const liked = post.likes.includes(user?.id)
  const meta = postTypeMeta(post.type)

  const submitComment = (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    onComment(commentText)
    setCommentText('')
    setShowComments(true)
  }

  return (
    <Card className="space-y-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-student-soft text-sm font-semibold text-student">
            {initials(post.author_name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{post.author_name}</p>
            <p className="text-xs text-white/35">{formatDate(post.created_at)}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${meta.tone}`}>{meta.label}</span>
          {post.author_id === user?.id && (
            <button onClick={onDelete} className="text-white/25 hover:text-red-400" title="Delete post">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <p className="whitespace-pre-wrap text-sm text-white/80">{post.content}</p>

      {post.image && (
        <img src={post.image} alt="" className="max-h-80 w-full rounded-xl border border-bg-border object-cover" />
      )}

      {post.link && (
        <a
          href={post.link}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-lg border border-organizer/30 bg-organizer-soft px-3 py-2 text-xs font-medium text-organizer hover:brightness-110"
        >
          <LinkIcon size={13} className="shrink-0" />
          <span className="truncate">{post.link}</span>
        </a>
      )}

      {post.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="student">{tag}</Badge>
          ))}
        </div>
      )}

      <div className="flex items-center gap-5 border-t border-bg-border pt-3 text-xs text-white/50">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 hover:text-student ${liked ? 'text-student' : ''}`}
        >
          <Heart size={15} className={liked ? 'fill-student' : ''} /> {post.likes.length}
        </button>
        <button onClick={() => setShowComments((v) => !v)} className="flex items-center gap-1.5 hover:text-white">
          <MessageCircle size={15} /> {post.comments.length}
        </button>
        <button onClick={onShare} className="flex items-center gap-1.5 hover:text-white">
          <Share2 size={15} /> {post.shares || 0}
        </button>
      </div>

      {showComments && (
        <div className="space-y-2.5 border-t border-bg-border pt-3">
          {post.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[10px] font-semibold text-white/70">
                {initials(c.author_name)}
              </span>
              <div className="rounded-lg border border-bg-border bg-white/[0.02] px-3 py-1.5">
                <p className="text-[11px] font-semibold text-white/70">{c.author_name}</p>
                <p className="text-xs text-white/60">{c.text}</p>
              </div>
            </div>
          ))}
          <form onSubmit={submitComment} className="flex items-center gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 text-xs"
            />
          </form>
        </div>
      )}
    </Card>
  )
}
