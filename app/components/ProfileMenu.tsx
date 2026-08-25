'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

interface SessionInfo {
  userId: string
  username: string
  phone?: string
  role: string
  authMethod?: string
}

function maskMiddle(value: string): string {
  if (value.length <= 4) return value
  const visibleStart = Math.ceil(value.length / 3)
  const visibleEnd = Math.ceil(value.length / 3)
  const start = value.slice(0, visibleStart)
  const end = value.slice(value.length - visibleEnd)
  const masked = '*'.repeat(Math.max(value.length - visibleStart - visibleEnd, 3))
  return `${start}${masked}${end}`
}

export default function ProfileMenu() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSession(data))
      .catch(() => setSession(null))
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const contact = session?.phone
    ? `+91-${maskMiddle(session.phone)}`
    : session?.username
    ? maskMiddle(session.username)
    : ''

  const drawer = isOpen && mounted ? createPortal(
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-slate-900 border-l border-slate-700/50 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white">My Profile</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-500/50 flex items-center justify-center text-4xl">
                  👤
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">User ID</p>
                <p className="text-white font-mono break-all">{session?.userId || '—'}</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">
                  {session?.phone ? 'Phone Number' : 'Email'}
                </p>
                <p className="text-white font-mono">{contact || '—'}</p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/chat')
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                >
                  🚨 Report Fraud
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/track-complaint')
                  }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                >
                  ☑️ Track Complaint
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700/50">
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>,
    document.body
  ) : null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-500/50 flex items-center justify-center text-white hover:opacity-80 transition"
        title="Profile"
      >
        👤
      </button>
      {drawer}
    </>
  )
}
