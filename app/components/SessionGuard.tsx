'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

// Government-portal style session behavior using only custom in-page popups
// (no native browser dialogs):
//  - Inactivity: after IDLE_WARN_MS with no activity, a custom "session timeout"
//    modal appears with a countdown. Stay logged in -> the timer resets. Logout
//    (or the countdown reaching zero) -> the user is logged out.
//  - Refresh: the page logs the user out and shows a custom notice popup.
//  - Back/Forward: the user is logged out and shown the custom notice popup.
// The session cookie is httpOnly, so JavaScript cannot clear it directly — we
// must call the logout API.

const IDLE_WARN_MS = 5 * 60 * 1000 // Inactivity before the warning appears.
const COUNTDOWN_SECONDS = 30 // Grace period once the warning is shown.
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']

const BACK_NOTICE =
  'You have been logged out. Using the browser back button ends your session for security reasons. Please sign in again to continue.'
const RELOAD_NOTICE =
  'You have been signed out because the page was refreshed. For your security, the National Cyber Crime Reporting Portal ends your session on a full page refresh. Please sign in again to continue.'
// Custom message shown in the refresh-confirmation popup. Edit this text freely.
const REFRESH_CONFIRM_MESSAGE =
  'You are about to refresh this page. For your security, refreshing will end your current session and log you out of the National Cyber Crime Reporting Portal. Do you want to continue?'

async function fetchLoggedIn(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

async function logoutRequest(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  } catch {
    // Best effort — the user is still sent to /login.
  }
}

export default function SessionGuard() {
  const pathname = usePathname()
  const loggedInRef = useRef(false)
  const handledRef = useRef(false)
  const idleOpenRef = useRef(false)
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastArmRef = useRef(0)

  const [notice, setNotice] = useState<string | null>(null)
  const [idleOpen, setIdleOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)
  const [confirmRefreshOpen, setConfirmRefreshOpen] = useState(false)

  const clearIdleTimers = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
      idleTimeoutRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const doIdleLogout = useCallback(async () => {
    clearIdleTimers()
    idleOpenRef.current = false
    loggedInRef.current = false
    await logoutRequest()
    window.location.replace('/')
  }, [clearIdleTimers])

  const openIdleWarning = useCallback(() => {
    idleOpenRef.current = true
    setIdleOpen(true)
    setSecondsLeft(COUNTDOWN_SECONDS)
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          void doIdleLogout()
          return 0
        }
        return s - 1
      })
    }, 1000)
  }, [doIdleLogout])

  const armIdle = useCallback(() => {
    if (idleOpenRef.current) return // Do not reset while the warning is showing.
    clearIdleTimers()
    idleTimeoutRef.current = setTimeout(openIdleWarning, IDLE_WARN_MS)
  }, [clearIdleTimers, openIdleWarning])

  const disarmIdle = useCallback(() => {
    clearIdleTimers()
    idleOpenRef.current = false
    setIdleOpen(false)
  }, [clearIdleTimers])

  const stayLoggedIn = useCallback(async () => {
    const stillValid = await fetchLoggedIn()
    if (!stillValid) {
      void doIdleLogout()
      return
    }
    idleOpenRef.current = false
    setIdleOpen(false)
    clearIdleTimers()
    idleTimeoutRef.current = setTimeout(openIdleWarning, IDLE_WARN_MS)
  }, [clearIdleTimers, openIdleWarning, doIdleLogout])

  const showNotice = useCallback(async (message: string) => {
    if (handledRef.current) return
    const wasLoggedIn = loggedInRef.current || (await fetchLoggedIn())
    if (!wasLoggedIn) return
    handledRef.current = true
    loggedInRef.current = false
    clearIdleTimers()
    await logoutRequest()
    setNotice(message)
  }, [clearIdleTimers])

  // User confirmed the refresh popup: log out, then reload the page.
  const confirmRefresh = useCallback(async () => {
    setConfirmRefreshOpen(false)
    loggedInRef.current = false
    clearIdleTimers()
    await logoutRequest()
    window.location.reload()
  }, [clearIdleTimers])

  // Keep login state fresh across client-side navigations (login uses
  // router.push, so a one-time check at mount would go stale) and (dis)arm the
  // idle timer accordingly.
  useEffect(() => {
    let cancelled = false
    fetchLoggedIn().then((value) => {
      if (cancelled) return
      loggedInRef.current = value
      if (value) armIdle()
      else disarmIdle()
    })
    return () => {
      cancelled = true
    }
  }, [pathname, armIdle, disarmIdle])

  // One-time listeners: user activity (resets idle timer) and navigation events.
  useEffect(() => {
    const onActivity = () => {
      if (!loggedInRef.current || idleOpenRef.current) return
      const now = Date.now()
      if (now - lastArmRef.current < 1000) return // Throttle re-arming.
      lastArmRef.current = now
      armIdle()
    }

    // Distinguish the physical browser back/forward buttons from in-app
    // navigations (e.g. a "Back" button calling history.back() or router.back()).
    // We flag app-initiated history calls by patching the History API so the
    // popstate handler can ignore them — only real browser buttons log out.
    let appInitiatedNav = false
    let appNavResetTimer: ReturnType<typeof setTimeout> | null = null
    const markAppNav = () => {
      appInitiatedNav = true
      if (appNavResetTimer) clearTimeout(appNavResetTimer)
      // Safety net in case popstate never fires (e.g. back() with no history).
      appNavResetTimer = setTimeout(() => {
        appInitiatedNav = false
      }, 1000)
    }
    const originalBack = window.history.back.bind(window.history)
    const originalForward = window.history.forward.bind(window.history)
    const originalGo = window.history.go.bind(window.history)
    window.history.back = () => {
      markAppNav()
      originalBack()
    }
    window.history.forward = () => {
      markAppNav()
      originalForward()
    }
    window.history.go = (delta?: number) => {
      markAppNav()
      originalGo(delta)
    }

    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    if (nav?.type === 'back_forward') {
      // A cross-document back/forward reached via the physical browser buttons.
      void showNotice(BACK_NOTICE)
    } else if (nav?.type === 'reload') {
      // A reload got through the native confirm (toolbar button / tab reload).
      // Log out and show a friendly notice popup so the user understands what
      // happened, instead of a silent redirect.
      void showNotice(RELOAD_NOTICE)
    }

    // Native "are you sure" confirmation for the toolbar reload button and tab
    // close, which no script can intercept. It does NOT fire for Cmd+R/F5 (those
    // are prevented before any unload) nor for our own post-logout reloads
    // (loggedInRef is already false by then).
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!loggedInRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }

    const onPopState = () => {
      if (appInitiatedNav) {
        appInitiatedNav = false // In-app navigation — do not log out.
        return
      }
      void showNotice(BACK_NOTICE)
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted && !appInitiatedNav) void showNotice(BACK_NOTICE)
    }

    // Intercept keyboard refresh (F5 / Ctrl+R / Cmd+R) and show our own
    // confirmation popup instead of letting the browser refresh immediately.
    // Capture phase so we run before other handlers. The browser's toolbar
    // reload button cannot be intercepted by any script.
    const onKeyDown = (e: KeyboardEvent) => {
      const isRefreshKey =
        e.key === 'F5' || ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R'))
      if (!isRefreshKey || !loggedInRef.current) return
      e.preventDefault()
      e.stopPropagation()
      setConfirmRefreshOpen(true)
    }

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, onActivity, { passive: true })
    )
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('popstate', onPopState)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity))
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('popstate', onPopState)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (appNavResetTimer) clearTimeout(appNavResetTimer)
      window.history.back = originalBack
      window.history.forward = originalForward
      window.history.go = originalGo
      clearIdleTimers()
    }
  }, [armIdle, clearIdleTimers, showNotice])

  if (notice) {
    return (
      <ModalShell title="Session Ended">
        <p className="px-5 py-4 text-sm leading-relaxed text-gray-700">{notice}</p>
        <ModalFooter>
          <PrimaryButton onClick={() => window.location.replace('/')}>
            Go to Home
          </PrimaryButton>
        </ModalFooter>
      </ModalShell>
    )
  }

  if (confirmRefreshOpen) {
    return (
      <ModalShell title="Confirm Page Refresh">
        <p className="px-5 py-4 text-sm leading-relaxed text-gray-700">
          {REFRESH_CONFIRM_MESSAGE}
        </p>
        <ModalFooter>
          <SecondaryButton onClick={() => setConfirmRefreshOpen(false)}>Cancel</SecondaryButton>
          <PrimaryButton onClick={() => void confirmRefresh()}>Continue &amp; Log Out</PrimaryButton>
        </ModalFooter>
      </ModalShell>
    )
  }

  if (idleOpen) {
    return (
      <ModalShell title="Session Timeout Warning">
        <p className="px-5 py-4 text-sm leading-relaxed text-gray-700">
          You have been inactive for a while. For your security, you will be automatically
          logged out in <span className="font-semibold text-[#0b3d91]">{secondsLeft}</span>{' '}
          second{secondsLeft === 1 ? '' : 's'}. Do you want to stay signed in?
        </p>
        <ModalFooter>
          <SecondaryButton onClick={() => void doIdleLogout()}>Logout now</SecondaryButton>
          <PrimaryButton onClick={() => void stayLoggedIn()}>Stay logged in</PrimaryButton>
        </ModalFooter>
      </ModalShell>
    )
  }

  return null
}

function ModalShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-modal-title"
        className="w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-center gap-2 bg-[#0b3d91] px-5 py-3">
          <span aria-hidden className="text-lg">🔒</span>
          <h2 id="session-modal-title" className="text-base font-semibold text-white">
            {title}
          </h2>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-3">{children}</div>
  )
}

function PrimaryButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="rounded bg-[#0b3d91] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a3480]"
    >
      {children}
    </button>
  )
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
    >
      {children}
    </button>
  )
}
