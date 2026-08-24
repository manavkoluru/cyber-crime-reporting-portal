import { NextRequest } from 'next/server'
import { getSession } from './store'

export interface AuthContext {
  userId: string
  username: string
  role: string
  jurisdiction?: string
  isAuthenticated: boolean
}

export function getAuthFromRequest(req: NextRequest): AuthContext {
  const sessionId = req.cookies.get('auth_session')?.value

  if (!sessionId) {
    return {
      userId: '',
      username: '',
      role: '',
      isAuthenticated: false,
    }
  }

  const session = getSession(sessionId)
  if (!session) {
    return {
      userId: '',
      username: '',
      role: '',
      isAuthenticated: false,
    }
  }

  return {
    userId: session.userId,
    username: session.username,
    role: session.role,
    jurisdiction: session.jurisdiction,
    isAuthenticated: true,
  }
}

// Client-side auth helper (for use client components)
export async function getAuthUser() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (res.ok) {
      return await res.json()
    }
  } catch (err) {
    console.error('[Auth] Failed to get user:', err)
  }
  return null
}

export async function logout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
}
