import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const AuthContext = createContext(null)
const STORAGE_KEY = 'sabrconnect.session'
const USERS_KEY = 'sabrconnect.users'
const AUTH_VERSION = '3'
const AUTH_VERSION_KEY = 'sabrconnect.authVersion'
// Set right before redirecting to Google with a role chosen on the Sign Up
// screen, and consumed the moment the browser comes back — see
// resolveOAuthRole() below for why this is needed at all.
const PENDING_ROLE_KEY = 'sabrconnect.pendingRole'

// One-time cleanup: wipe any accounts/sessions created against the old
// data model so nobody is stuck signed in as a leftover test account.
if (typeof window !== 'undefined' && localStorage.getItem(AUTH_VERSION_KEY) !== AUTH_VERSION) {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(USERS_KEY)
  localStorage.setItem(AUTH_VERSION_KEY, AUTH_VERSION)
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || []
  } catch {
    return []
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Reactive mirror of the USERS_KEY store (mock/local path only) so the
  // organizer's Approvals screen re-renders the moment a signup request is
  // accepted/rejected, instead of needing a manual refresh.
  const [users, setUsers] = useState(readUsers)

  const persistUsers = (list) => {
    writeUsers(list)
    setUsers(list)
  }

  // Cross-tab sync for the users store, mirroring DataContext's approach —
  // an organizer approving a request in one tab should be reflected
  // immediately for a student/volunteer polling their status in another.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== USERS_KEY || !e.newValue) return
      try {
        setUsers(JSON.parse(e.newValue) || [])
      } catch {
        // ignore malformed payload from another tab
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // In Supabase mode, `user.id` throughout the app must be the `profiles.id`
  // row — every table (applications, teams, notifications, ...) references
  // profiles(id), not auth.users(id) directly. This loads that profile row
  // and merges it with the auth session so `user.id` is consistent with the
  // mock-mode shape everywhere else in the app.
  const loadProfileUser = async (sessionUser) => {
    if (!sessionUser) return null
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', sessionUser.id)
      .maybeSingle()
    if (error || !profile) return null
    return { ...profile, email: sessionUser.email, auth_id: sessionUser.id }
  }

  // Google carries no custom metadata, so the signup trigger (see
  // supabase/migrations/001_profile_trigger.sql) always creates a brand-new
  // Google user's profile with the default role ('student') — it has no way
  // to know the person actually picked "Organizer" or "Volunteer" on the Sign
  // Up screen. signInWithGoogle() stashes that choice in localStorage right
  // before the redirect; this corrects the profile the moment we're back,
  // whether the trigger already ran (update) or hasn't yet (insert first).
  const resolveOAuthRole = async (sessionUser) => {
    const pendingRole = typeof window !== 'undefined' ? localStorage.getItem(PENDING_ROLE_KEY) : null
    if (!pendingRole || !sessionUser) return
    localStorage.removeItem(PENDING_ROLE_KEY)

    const fullName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'New User'
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({ user_id: sessionUser.id, full_name: fullName, role: pendingRole, status: 'approved' })
    if (insertError) {
      // Profile already existed (the trigger got there first) — fix the role.
      await supabase.from('profiles').update({ role: pendingRole }).eq('user_id', sessionUser.id)
    }
  }

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(async ({ data }) => {
        await resolveOAuthRole(data.session?.user)
        const profileUser = await loadProfileUser(data.session?.user)
        setUser(profileUser)
        setLoading(false)
      })
      const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        await resolveOAuthRole(session?.user)
        const profileUser = await loadProfileUser(session?.user)
        setUser(profileUser)
      })
      return () => listener.subscription.unsubscribe()
    }

    // Mock/local persistence path
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
      if (saved) setUser(saved)
    } catch {
      // ignore corrupt storage
    }
    setLoading(false)
  }, [])

  const persist = (nextUser) => {
    setUser(nextUser)
    if (nextUser) localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    else localStorage.removeItem(STORAGE_KEY)
  }

  // Right after signUp, the profiles row is created by a database trigger
  // (see supabase/migrations/001_profile_trigger.sql), not by this client —
  // a client-side insert here would run before the browser necessarily has
  // an authenticated session (e.g. when email confirmation is required),
  // which is exactly what caused RLS to reject it. The trigger runs with
  // elevated privileges as part of the same transaction that creates the
  // auth user, so it doesn't have that race. We just poll briefly for it.
  const waitForProfile = async (sessionUser, attempts = 5) => {
    for (let i = 0; i < attempts; i += 1) {
      const profile = await loadProfileUser(sessionUser)
      if (profile) return profile
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
    return null
  }

  const signUp = async ({ fullName, email, password, role }) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role } },
      })
      if (error) throw error

      let profileUser = await waitForProfile(data.user)

      // Fallback: if the DB trigger isn't installed (or just hasn't
      // committed yet) but we already have an authenticated session — which
      // happens whenever "Confirm email" is off — create the profile
      // directly instead. RLS allows this because auth.uid() now equals
      // this user's own id, so it isn't the same race the trigger exists
      // to avoid.
      if (!profileUser && data.session) {
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({ user_id: data.user.id, full_name: fullName, role, status: 'approved' })
          .select()
          .single()
        if (!insertError && inserted) {
          profileUser = { ...inserted, email }
        } else if (insertError?.code === '23505') {
          // Unique violation: the trigger inserted it a beat after we
          // checked. Just fetch what's there now.
          profileUser = await loadProfileUser(data.user)
        }
      }

      if (!profileUser) {
        throw new Error(
          'Account created, but your profile is still being set up — please try signing in again in a moment.',
        )
      }
      // Everyone can use the app immediately — only hackathon/internship
      // *applications* go through organizer approval, not the account itself.
      setUser(profileUser)
      return profileUser
    }

    const existingUsers = readUsers()
    if (existingUsers.some((u) => u.email === email)) {
      throw new Error('An account with this email already exists.')
    }
    const newUser = {
      id: `user-${Date.now()}`,
      full_name: fullName,
      email,
      password,
      role,
      status: 'approved',
      college: '',
      bio: '',
      skills: [],
      created_at: new Date().toISOString(),
    }
    persistUsers([...existingUsers, newUser])
    const { password: _pw, ...safeUser } = newUser
    persist(safeUser)
    return safeUser
  }

  const signIn = async ({ email, password }) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const profileUser = await loadProfileUser(data.user)
      if (!profileUser) {
        // Auth succeeded but there's no matching profiles row — an orphaned
        // account from before the signup trigger existed. Sign back out so
        // the user isn't left in a half-authenticated state, and surface a
        // clear message instead of leaving `user` null for callers that
        // assume `user.role` is always present right after sign-in.
        await supabase.auth.signOut()
        throw new Error(
          'Your account is missing some setup data. Please contact support, or sign up again with a different email.',
        )
      }
      setUser(profileUser)
      return profileUser
    }

    const users = readUsers()
    const found = users.find((u) => u.email === email && u.password === password)
    if (!found) throw new Error('Invalid email or password.')
    const { password: _pw, ...safeUser } = found
    persist(safeUser)
    return safeUser
  }

  // `role` is only meaningful for brand-new accounts — pass it from the Sign
  // Up screen so a fresh Google sign-in lands as the chosen role instead of
  // defaulting to student. Omit it from the Sign In screen so an existing
  // account's role is never touched.
  const signInWithGoogle = async (role) => {
    if (isSupabaseConfigured) {
      if (role) localStorage.setItem(PENDING_ROLE_KEY, role)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        localStorage.removeItem(PENDING_ROLE_KEY)
        throw error
      }
      // The browser is now navigating away to Google — nothing to return yet.
      return null
    }

    // Mock/local mode: there's no backend to actually talk to Google with, so
    // this simulates an instant sign-in using the chosen role, the same way
    // signInDemo() does. Keeps the button usable before Supabase is wired up.
    const mockUser = {
      id: `google-${role || 'student'}-${Date.now()}`,
      full_name:
        role === 'organizer' ? 'Google Organizer' : role === 'volunteer' ? 'Google Volunteer' : 'Google Student',
      email: `${role || 'student'}.google@example.com`,
      role: role || 'student',
      status: 'approved',
      college: '',
      bio: '',
      skills: [],
      created_at: new Date().toISOString(),
    }
    persistUsers([...readUsers(), mockUser])
    persist(mockUser)
    return mockUser
  }

  const signInDemo = (role) => {
    const demo = {
      id: `demo-${role}`,
      full_name: role === 'student' ? 'Ananya Rao' : role === 'volunteer' ? 'Rhea Singh' : 'IBM Innovation Cell',
      email: `${role}@demo.sabrconnect.dev`,
      role,
      college: role === 'student' ? 'VIT Vellore' : '',
      bio: '',
      skills: role === 'student' ? ['React', 'Python', 'UI Design'] : [],
      created_at: new Date().toISOString(),
    }
    persist(demo)
    return demo
  }

  const updateProfile = async (updates) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
      if (error) throw error
      setUser((prev) => ({ ...prev, ...updates }))
      return
    }
    const list = readUsers().map((u) => (u.id === user.id ? { ...u, ...updates } : u))
    persistUsers(list)
    persist({ ...user, ...updates })
  }

  // ---------- Account approvals (student/volunteer signup requests) ----------
  // Any signed-in organizer can review requests — the mock backend has no
  // per-organizer scoping for account approval, only for events.
  //
  // Supabase mode: `profiles` is a real, shared table, so approvals need to
  // be fetched live rather than mirrored from a single browser's
  // localStorage. `supabaseUsers` is refreshed on demand by the two getters
  // below and kept fresh by a realtime subscription while any component is
  // mounted and calling them.
  const [supabaseUsers, setSupabaseUsers] = useState([])

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let active = true
    const refresh = async () => {
      const { data } = await supabase.from('profiles').select('*').neq('role', 'organizer')
      if (active && data) setSupabaseUsers(data)
    }
    refresh()
    const channel = supabase
      .channel('realtime:profiles:approvals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refresh)
      .subscribe()
    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  const getPendingUsers = () => {
    if (isSupabaseConfigured) return supabaseUsers.filter((u) => u.status === 'pending')
    return users.filter((u) => u.status === 'pending').map(({ password: _pw, ...safe }) => safe)
  }

  const getUsersByStatus = (status) => {
    if (isSupabaseConfigured) {
      return supabaseUsers.filter((u) => (status ? u.status === status : true))
    }
    return users
      .filter((u) => (status ? u.status === status : true) && u.role !== 'organizer')
      .map(({ password: _pw, ...safe }) => safe)
  }

  const approveUser = async (userId) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('profiles').update({ status: 'approved' }).eq('id', userId)
      if (error) throw error
      return
    }
    persistUsers(readUsers().map((u) => (u.id === userId ? { ...u, status: 'approved' } : u)))
  }

  const rejectUser = async (userId) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('profiles').update({ status: 'rejected' }).eq('id', userId)
      if (error) throw error
      return
    }
    persistUsers(readUsers().map((u) => (u.id === userId ? { ...u, status: 'rejected' } : u)))
  }

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    persist(null)
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signInDemo,
      signOut,
      updateProfile,
      isSupabaseConfigured,
      getPendingUsers,
      getUsersByStatus,
      approveUser,
      rejectUser,
    }),
    [user, loading, users, supabaseUsers],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
