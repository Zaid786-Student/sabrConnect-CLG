import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// SabrConnect ships with a fully working local/mock data layer (see mockBackend.js)
// so the app runs immediately with `npm install && npm run dev`.
//
// To connect a real Supabase project:
//   1. Run the SQL in /supabase/schema.sql inside your Supabase project.
//   2. Copy .env.example to .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
//   3. `isSupabaseConfigured` will flip to true and services/* will use `supabase` instead of the mock layer.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// ---------------------------------------------------------------------------
// Realtime helpers shared by every module in src/context/data/*
// ---------------------------------------------------------------------------

// Subscribes to every INSERT/UPDATE/DELETE on `table` (optionally narrowed by
// a Postgres `filter`, e.g. "organizer_id=eq.<id>") and invokes `onChange`
// with the raw payload. Returns an unsubscribe function. No-ops when
// Supabase isn't configured, so callers don't need to branch.
export function subscribeTable(table, onChange, filter) {
  if (!isSupabaseConfigured) return () => {}
  const channelName = `realtime:${table}:${filter || 'all'}:${Math.random().toString(36).slice(2)}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
      onChange,
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// Applies one postgres_changes payload to a locally-held array, so realtime
// updates from other users/tabs merge into React state without a refetch.
// `mapRow` converts a raw DB row into the shape the app already uses
// (snake_case -> camelCase, etc.) if the module needs that.
export function applyRealtimeChange(list, payload, mapRow = (row) => row) {
  const { eventType, new: newRow, old: oldRow } = payload
  if (eventType === 'INSERT') {
    if (!newRow?.id || list.some((item) => item.id === newRow.id)) return list
    return [mapRow(newRow), ...list]
  }
  if (eventType === 'UPDATE') {
    if (!newRow?.id) return list
    return list.map((item) => (item.id === newRow.id ? { ...item, ...mapRow(newRow) } : item))
  }
  if (eventType === 'DELETE') {
    if (!oldRow?.id) return list
    return list.filter((item) => item.id !== oldRow.id)
  }
  return list
}
