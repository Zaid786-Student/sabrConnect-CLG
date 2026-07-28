import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { supabase, isSupabaseConfigured, subscribeTable, applyRealtimeChange } from '../../lib/supabaseClient'
import { useLocalTable } from '../../lib/localStore'
import { uid, feedPath } from '../../lib/utils'
import { seedPosts } from '../../data/mockData'

export const SocialContext = createContext(null)
const FOLLOWS_KEY = 'sabrconnect.follows'
const CONNECTIONS_KEY = 'sabrconnect.connections'
const CONVERSATIONS_KEY = 'sabrconnect.conversations'
const POSTS_KEY = 'sabrconnect.posts'

function assemblePosts(postRows, likeRows, commentRows) {
  return postRows.map((p) => ({
    ...p,
    likes: likeRows.filter((l) => l.post_id === p.id).map((l) => l.user_id),
    comments: commentRows
      .filter((c) => c.post_id === p.id)
      .map((c) => ({ id: c.id, author_id: c.author_id, author_name: c.author_name, text: c.text, created_at: c.created_at })),
  }))
}

function assembleConversations(convoRows, participantRows, messageRows) {
  return convoRows.map((c) => {
    const parts = participantRows.filter((p) => p.conversation_id === c.id)
    return {
      id: c.id,
      participantIds: parts.map((p) => p.user_id),
      participants: parts.map((p) => ({ id: p.user_id, name: p.name })),
      messages: messageRows
        .filter((m) => m.conversation_id === c.id)
        .map((m) => ({ id: m.id, text: m.text, sender_id: m.sender_id, sender_name: m.sender_name, read: m.read, created_at: m.created_at })),
      updated_at: c.updated_at,
    }
  })
}

// Depends on Notifications (addNotification).
export function useSocialModule({ addNotification }) {
  const [follows, setFollows] = useLocalTable(FOLLOWS_KEY, [])
  const [connections, setConnections] = useLocalTable(CONNECTIONS_KEY, [])
  const [conversations, setConversations] = useLocalTable(CONVERSATIONS_KEY, [])
  const [posts, setPosts] = useLocalTable(POSTS_KEY, seedPosts)
  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations

  const reloadPosts = async () => {
    const [{ data: postRows }, { data: likeRows }, { data: commentRows }] = await Promise.all([
      supabase.from('posts').select('*').order('created_at', { ascending: false }),
      supabase.from('post_likes').select('*'),
      supabase.from('post_comments').select('*').order('created_at', { ascending: true }),
    ])
    if (postRows) setPosts(assemblePosts(postRows, likeRows || [], commentRows || []))
  }

  // Conversations only need to be re-fetched for participants the current
  // browser session cares about; since this loads on mount for whoever is
  // signed in, RLS already scopes conversations/messages to their own rows.
  const reloadConversations = async () => {
    const [{ data: convoRows }, { data: participantRows }, { data: messageRows }] = await Promise.all([
      supabase.from('conversations').select('*').order('updated_at', { ascending: false }),
      supabase.from('conversation_participants').select('*'),
      supabase.from('messages').select('*').order('created_at', { ascending: true }),
    ])
    if (convoRows) setConversations(assembleConversations(convoRows, participantRows || [], messageRows || []))
  }

  const profilesByIdRef = useRef({})

  const enrichFollow = (f) => ({
    ...f,
    follower_name: f.follower_name || profilesByIdRef.current[f.follower_id]?.full_name || 'Student',
    following_name: f.following_name || profilesByIdRef.current[f.following_id]?.full_name || 'Student',
  })
  const enrichConnection = (c) => ({
    ...c,
    from_name: c.from_name || profilesByIdRef.current[c.from_id]?.full_name || 'Student',
    to_name: c.to_name || profilesByIdRef.current[c.to_id]?.full_name || 'Student',
  })

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true

    Promise.all([
      supabase.from('follows').select('*'),
      supabase.from('connections').select('*'),
      supabase.from('profiles').select('id, full_name'),
    ]).then(([{ data: followRows }, { data: connRows }, { data: profileRows }]) => {
      if (!active) return
      profilesByIdRef.current = Object.fromEntries((profileRows || []).map((p) => [p.id, p]))
      if (followRows) setFollows(followRows.map(enrichFollow))
      if (connRows) setConnections(connRows.map(enrichConnection))
    })
    reloadPosts()
    reloadConversations()

    const unsubs = [
      subscribeTable('follows', (payload) => setFollows((prev) => applyRealtimeChange(prev, payload, enrichFollow))),
      subscribeTable('connections', (payload) => setConnections((prev) => applyRealtimeChange(prev, payload, enrichConnection))),
      subscribeTable('posts', reloadPosts),
      subscribeTable('post_likes', reloadPosts),
      subscribeTable('post_comments', reloadPosts),
      subscribeTable('conversations', reloadConversations),
      subscribeTable('conversation_participants', reloadConversations),
      subscribeTable('messages', reloadConversations),
    ]
    return () => {
      active = false
      unsubs.forEach((u) => u())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- Follow system ----------
  const isFollowing = (followerId, targetId) => follows.some((f) => f.follower_id === followerId && f.following_id === targetId)

  const followUser = async (follower, target) => {
    if (!follower?.id || !target?.id || follower.id === target.id) return undefined
    if (isFollowing(follower.id, target.id)) return undefined
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('follows')
        .insert({ follower_id: follower.id, following_id: target.id })
        .select()
        .single()
      if (error) return undefined
      setFollows((list) => [{ ...data, follower_name: follower.full_name, following_name: target.full_name }, ...list])
    } else {
      const record = {
        id: uid('follow'),
        follower_id: follower.id,
        follower_name: follower.full_name,
        following_id: target.id,
        following_name: target.full_name,
        created_at: new Date().toISOString(),
      }
      setFollows((list) => [record, ...list])
    }
    addNotification(target.id, {
      title: 'New follower',
      message: `${follower.full_name || 'A student'} started following you.`,
      role: 'student',
      link: '/dashboard/student/connect',
    })
  }

  const unfollowUser = async (followerId, targetId) => {
    if (isSupabaseConfigured) {
      await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', targetId)
    }
    setFollows((list) => list.filter((f) => !(f.follower_id === followerId && f.following_id === targetId)))
  }

  const getFollowers = (userId) => follows.filter((f) => f.following_id === userId)
  const getFollowing = (userId) => follows.filter((f) => f.follower_id === userId)

  // ---------- Connect requests (LinkedIn-style) ----------
  const getConnection = (userIdA, userIdB) =>
    connections.find((c) => (c.from_id === userIdA && c.to_id === userIdB) || (c.from_id === userIdB && c.to_id === userIdA))

  const getConnectionStatus = (userIdA, userIdB) => {
    const c = getConnection(userIdA, userIdB)
    if (!c) return 'none'
    if (c.status === 'accepted') return 'connected'
    if (c.status === 'pending') return c.from_id === userIdA ? 'pending_sent' : 'pending_received'
    return 'none'
  }

  const sendConnectRequest = async (from, to) => {
    if (!from?.id || !to?.id || from.id === to.id) return undefined
    const existing = getConnection(from.id, to.id)
    if (existing && existing.status !== 'rejected') return existing

    if (isSupabaseConfigured) {
      if (existing) await supabase.from('connections').delete().eq('id', existing.id)
      const { data, error } = await supabase
        .from('connections')
        .insert({ from_id: from.id, to_id: to.id, status: 'pending' })
        .select()
        .single()
      if (error) return undefined
      setConnections((list) => [{ ...data, from_name: from.full_name, to_name: to.full_name }, ...list.filter((c) => c.id !== existing?.id)])
      addNotification(to.id, {
        title: 'New connection request',
        message: `${from.full_name || 'A student'} wants to connect with you.`,
        role: 'student',
        link: '/dashboard/student/connect',
      })
      return data
    }

    const request = {
      id: uid('conn'),
      from_id: from.id,
      from_name: from.full_name,
      to_id: to.id,
      to_name: to.full_name,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    setConnections((list) => [request, ...list.filter((c) => c.id !== existing?.id)])
    addNotification(to.id, {
      title: 'New connection request',
      message: `${from.full_name || 'A student'} wants to connect with you.`,
      role: 'student',
      link: '/dashboard/student/connect',
    })
    return request
  }

  const acceptConnectRequest = async (connectionId) => {
    const target = connections.find((c) => c.id === connectionId)
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('connections').update({ status: 'accepted' }).eq('id', connectionId)
      if (error) return
    }
    setConnections((list) => list.map((c) => (c.id === connectionId ? { ...c, status: 'accepted' } : c)))
    if (target) {
      addNotification(target.from_id, {
        title: 'Connection accepted 🎉',
        message: `${target.to_name || 'A student'} accepted your connection request.`,
        role: 'student',
        link: '/dashboard/student/connect',
      })
    }
  }

  const rejectConnectRequest = async (connectionId) => {
    const target = connections.find((c) => c.id === connectionId)
    if (isSupabaseConfigured) {
      await supabase.from('connections').update({ status: 'rejected' }).eq('id', connectionId)
    }
    setConnections((list) => list.map((c) => (c.id === connectionId ? { ...c, status: 'rejected' } : c)))
    if (target) {
      addNotification(target.from_id, {
        title: 'Connection request update',
        message: 'Your connection request was declined.',
        role: 'student',
        link: '/dashboard/student/connect',
      })
    }
  }

  const cancelConnectRequest = async (connectionId) => {
    if (isSupabaseConfigured) {
      await supabase.from('connections').delete().eq('id', connectionId)
    }
    setConnections((list) => list.filter((c) => c.id !== connectionId))
  }

  const getConnectionsForUser = (userId) =>
    connections.filter((c) => c.status === 'accepted' && (c.from_id === userId || c.to_id === userId))

  // ---------- Direct messaging ----------
  const findConversation = (userIdA, userIdB) =>
    conversationsRef.current.find((c) => c.participantIds.includes(userIdA) && c.participantIds.includes(userIdB))

  const getOrCreateConversation = async (userA, userB) => {
    const existing = findConversation(userA.id, userB.id)
    if (existing) return existing

    if (isSupabaseConfigured) {
      const newId = crypto.randomUUID()
      const { error: convoError } = await supabase.from('conversations').insert({ id: newId })
      if (convoError) {
        // eslint-disable-next-line no-console
        console.error('createConversation failed', convoError)
        return undefined
      }
      const { error: partError } = await supabase.from('conversation_participants').insert([
        { conversation_id: newId, user_id: userA.id, name: userA.full_name },
        { conversation_id: newId, user_id: userB.id, name: userB.full_name },
      ])
      if (partError) {
        // eslint-disable-next-line no-console
        console.error('createConversation participants failed', partError)
        return undefined
      }
      const conversation = {
        id: newId,
        participantIds: [userA.id, userB.id],
        participants: [
          { id: userA.id, name: userA.full_name },
          { id: userB.id, name: userB.full_name },
        ],
        messages: [],
        updated_at: new Date().toISOString(),
      }
      setConversations((list) => [conversation, ...list])
      return conversation
    }

    const conversation = {
      id: uid('conv'),
      participantIds: [userA.id, userB.id],
      participants: [
        { id: userA.id, name: userA.full_name },
        { id: userB.id, name: userB.full_name },
      ],
      messages: [],
      updated_at: new Date().toISOString(),
    }
    setConversations((list) => [conversation, ...list])
    return conversation
  }

  const getConversationsForUser = (userId) =>
    conversations
      .filter((c) => c.participantIds.includes(userId))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

  const sendDirectMessage = async (conversationId, text, sender) => {
    if (!text?.trim()) return undefined
    const convo = conversationsRef.current.find((c) => c.id === conversationId)
    const recipientId = convo?.participantIds.find((id) => id !== sender?.id)

    if (isSupabaseConfigured) {
      const newId = crypto.randomUUID()
      const createdAt = new Date().toISOString()
      const { error } = await supabase.from('messages').insert({
        id: newId,
        conversation_id: conversationId,
        sender_id: sender?.id,
        sender_name: sender?.full_name,
        text: text.trim(),
        created_at: createdAt,
      })
      if (error) {
        // eslint-disable-next-line no-console
        console.error('sendDirectMessage failed', error)
        return undefined
      }
      const data = { id: newId, conversation_id: conversationId, sender_id: sender?.id, sender_name: sender?.full_name, text: text.trim(), read: false, created_at: createdAt }
      await supabase.from('conversations').update({ updated_at: createdAt }).eq('id', conversationId)
      setConversations((list) =>
        list.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, data], updated_at: createdAt } : c)),
      )
      if (recipientId) {
        addNotification(recipientId, {
          title: `New message from ${sender?.full_name || 'a student'}`,
          message: text.trim().length > 60 ? `${text.trim().slice(0, 60)}…` : text.trim(),
          role: 'student',
          link: '/dashboard/student/messages',
        })
      }
      return data
    }

    const message = { id: uid('dm'), text: text.trim(), sender_id: sender?.id, sender_name: sender?.full_name, read: false, created_at: new Date().toISOString() }
    setConversations((list) =>
      list.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, message], updated_at: message.created_at } : c)),
    )
    if (recipientId) {
      addNotification(recipientId, {
        title: `New message from ${sender?.full_name || 'a student'}`,
        message: message.text.length > 60 ? `${message.text.slice(0, 60)}…` : message.text,
        role: 'student',
        link: '/dashboard/student/messages',
      })
    }
    return message
  }

  const markConversationRead = async (conversationId, userId) => {
    if (isSupabaseConfigured) {
      await supabase.from('messages').update({ read: true }).eq('conversation_id', conversationId).neq('sender_id', userId)
    }
    setConversations((list) =>
      list.map((c) =>
        c.id === conversationId ? { ...c, messages: c.messages.map((m) => (m.sender_id !== userId ? { ...m, read: true } : m)) } : c,
      ),
    )
  }

  // ---------- Networking feed ----------
  const addPost = async (data, author) => {
    const draft = {
      author_id: author?.id,
      author_name: author?.full_name,
      author_role: author?.role || 'student',
      type: data.type || 'project',
      content: data.content || '',
      tags: data.tags || [],
      image: data.image || null,
      link: data.link || null,
      linked_team_id: data.linked_team_id || null,
    }
    if (isSupabaseConfigured) {
      const { data: row, error } = await supabase.from('posts').insert(draft).select().single()
      if (error) {
        // eslint-disable-next-line no-console
        console.error('addPost failed', error)
        return undefined
      }
      const post = { ...row, likes: [], comments: [] }
      setPosts((list) => [post, ...list])
      return post
    }
    const post = { id: uid('post'), likes: [], comments: [], shares: 0, created_at: new Date().toISOString(), ...draft }
    setPosts((list) => [post, ...list])
    return post
  }

  const deletePost = async (postId, userId) => {
    if (isSupabaseConfigured) {
      await supabase.from('posts').delete().eq('id', postId).eq('author_id', userId)
    }
    setPosts((list) => list.filter((p) => !(p.id === postId && p.author_id === userId)))
  }

  const toggleLikePost = async (postId, userId) => {
    const post = posts.find((p) => p.id === postId)
    if (!post) return
    const liked = post.likes.includes(userId)

    if (isSupabaseConfigured) {
      if (liked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
      }
    }
    setPosts((list) =>
      list.map((p) => (p.id === postId ? { ...p, likes: liked ? p.likes.filter((id) => id !== userId) : [...p.likes, userId] } : p)),
    )
    if (post.author_id !== userId && !liked) {
      addNotification(post.author_id, {
        title: 'New like on your post',
        message: 'Someone liked your post in the Opportunity Feed.',
        role: post.author_role || 'student',
        link: feedPath(post.author_role),
      })
    }
  }

  const addPostComment = async (postId, text, author) => {
    if (!text?.trim()) return undefined
    const post = posts.find((p) => p.id === postId)

    let comment
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, author_id: author?.id, author_name: author?.full_name, text: text.trim() })
        .select()
        .single()
      if (error) return undefined
      comment = data
    } else {
      comment = { id: uid('cmt'), author_id: author?.id, author_name: author?.full_name, text: text.trim(), created_at: new Date().toISOString() }
    }
    setPosts((list) => list.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, comment] } : p)))
    if (post && post.author_id !== author?.id) {
      addNotification(post.author_id, {
        title: 'New comment on your post',
        message: `${author?.full_name || 'Someone'} commented: "${text.trim().slice(0, 50)}"`,
        role: post.author_role || 'student',
        link: feedPath(post.author_role),
      })
    }
    return comment
  }

  const sharePost = async (postId, sharer) => {
    const post = posts.find((p) => p.id === postId)
    const nextShares = (post?.shares || 0) + 1
    if (isSupabaseConfigured) {
      await supabase.from('posts').update({ shares: nextShares }).eq('id', postId)
    }
    setPosts((list) => list.map((p) => (p.id === postId ? { ...p, shares: nextShares } : p)))
    if (post && post.author_id !== sharer?.id) {
      addNotification(post.author_id, {
        title: 'Your post was shared',
        message: `${sharer?.full_name || 'Someone'} shared your post in the Opportunity Feed.`,
        role: post.author_role || 'student',
        link: feedPath(post.author_role),
      })
    }
  }

  return {
    follows,
    connections,
    conversations,
    posts,
    isFollowing,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getConnection,
    getConnectionStatus,
    sendConnectRequest,
    acceptConnectRequest,
    rejectConnectRequest,
    cancelConnectRequest,
    getConnectionsForUser,
    getOrCreateConversation,
    getConversationsForUser,
    sendDirectMessage,
    markConversationRead,
    addPost,
    deletePost,
    toggleLikePost,
    addPostComment,
    sharePost,
  }
}

export function SocialProvider({ children, deps }) {
  const value = useSocialModule(deps)
  const memoized = useMemo(
    () => value,
    [value.follows, value.connections, value.conversations, value.posts],
  )
  return <SocialContext.Provider value={memoized}>{children}</SocialContext.Provider>
}

export function useSocial() {
  const ctx = useContext(SocialContext)
  if (!ctx) throw new Error('useSocial must be used within SocialProvider')
  return ctx
}
