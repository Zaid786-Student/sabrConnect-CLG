import { useCallback, useEffect, useState } from 'react'

export function readLocal(key, fallback) {
  try {
    const raw = JSON.parse(localStorage.getItem(key))
    return raw ?? fallback
  } catch {
    return fallback
  }
}

export function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full/unavailable — state still updates in-memory for this tab
  }
}

// A reactive localStorage-backed list, kept in sync across browser tabs via
// the native `storage` event. This is the mock-mode stand-in for a Supabase
// Realtime subscription: when Supabase isn't configured, every open tab
// still sees writes from every other tab instantly, which is what makes the
// zero-setup demo path feel "real-time" without a backend.
export function useLocalTable(key, seed) {
  const [list, setList] = useState(() => readLocal(key, seed))

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== key || !e.newValue) return
      try {
        setList(JSON.parse(e.newValue))
      } catch {
        // ignore malformed payload from another tab
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  const update = useCallback(
    (updater) => {
      setList((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater
        writeLocal(key, next)
        return next
      })
    },
    [key],
  )

  return [list, update]
}
