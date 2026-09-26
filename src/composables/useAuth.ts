import { reactive, readonly } from 'vue'

export interface AuthUser {
  id: number
  email: string
  displayName: string | null
  pictureUrl: string | null
  createdAt: string
}

interface AuthState {
  user: AuthUser | null
  // True while we're still checking with the backend whether an existing
  // session cookie is valid. Lets the UI show a neutral state instead of
  // flashing "logged out" for a moment on every page load.
  isChecking: boolean
}

const API_BASE = import.meta.env.VITE_API_BASE_URL

// Singleton state — every component that calls useAuth() shares the same
// reactive object, so logging in from ProfileButton is instantly visible
// everywhere else (e.g. a future "save this bathroom" button).
const state = reactive<AuthState>({ user: null, isChecking: true })

// The JWT itself now lives only in an httpOnly cookie the browser manages —
// this app never sees or stores the raw token. Every request that needs
// auth just has to say "please attach cookies" via credentials: 'include'.
const fetchOpts: RequestInit = { credentials: 'include' }

async function loginWithGoogleIdToken(idToken: string) {
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })

  if (!res.ok) {
    throw new Error('Google sign-in failed')
  }

  state.user = await res.json()
}

/** Call once on app startup: asks the backend "does my cookie still work?" */
async function checkSession() {
  state.isChecking = true
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, fetchOpts)
    state.user = res.ok ? await res.json() : null
  } catch {
    state.user = null
  } finally {
    state.isChecking = false
  }
}

async function logout() {
  try {
    await fetch(`${API_BASE}/api/auth/logout`, { ...fetchOpts, method: 'POST' })
  } finally {
    state.user = null
    // Also tell Google to forget the auto-select choice, so the next
    // sign-in attempt shows the account picker instead of silently
    // re-using this one.
    window.google?.accounts?.id?.disableAutoSelect?.()
  }
}

export function useAuth() {
  return {
    state: readonly(state),
    loginWithGoogleIdToken,
    checkSession,
    logout,
    /** Spread this into any fetch() to a protected endpoint. */
    fetchOpts,
  }
}
