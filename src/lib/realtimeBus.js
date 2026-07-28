// A tiny cross-tab pub/sub bus. SabrConnect's data layer is local-first
// (see DataContext), so "real-time" here means: instant delivery to every
// open tab of this browser via the `storage` event, which is how multiple
// demo roles/users are typically previewed side by side during judging.
//
// Payloads are transient (presence pings, typing pings, live-message pings)
// and are NOT meant for durable storage — DataContext already persists the
// actual chat/connection data to localStorage separately.

const memoryListeners = new Map() // channel -> Set(callback)

function keyFor(channel) {
  return `rt:${channel}`
}

export function publish(channel, payload) {
  const envelope = { payload, ts: Date.now(), _r: Math.random().toString(36).slice(2) }
  try {
    localStorage.setItem(keyFor(channel), JSON.stringify(envelope))
  } catch {
    // storage full/unavailable — still deliver to same-tab listeners below
  }
  // `storage` events only fire in *other* tabs, so notify this tab directly.
  memoryListeners.get(channel)?.forEach((cb) => cb(payload))
}

export function subscribe(channel, callback) {
  if (!memoryListeners.has(channel)) memoryListeners.set(channel, new Set())
  memoryListeners.get(channel).add(callback)

  const storageKey = keyFor(channel)
  const handler = (e) => {
    if (e.key !== storageKey || !e.newValue) return
    try {
      callback(JSON.parse(e.newValue).payload)
    } catch {
      // ignore malformed envelope
    }
  }
  window.addEventListener('storage', handler)

  return () => {
    memoryListeners.get(channel)?.delete(callback)
    window.removeEventListener('storage', handler)
  }
}
