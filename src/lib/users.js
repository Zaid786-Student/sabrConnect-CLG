// Mirrors the storage key AuthContext writes signed-up accounts to. Kept as
// a separate read-only helper so the Connect/Discover feature can list real
// accounts without importing/altering the auth module.
const USERS_KEY = 'sabrconnect.users'

export function getRegisteredUsers() {
  try {
    const list = JSON.parse(localStorage.getItem(USERS_KEY)) || []
    return list.map(({ password, ...safe }) => safe)
  } catch {
    return []
  }
}
