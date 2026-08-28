'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const BOOT_MS = 1400

function BootingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const next = searchParams.get('next') || '/chat'
    const timer = setTimeout(() => {
      router.replace(next)
    }, BOOT_MS)
    return () => clearTimeout(timer)
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-[#0b3d91] flex flex-col items-center justify-center text-white px-4">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-white/20" />
        <div className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🛡️</div>
      </div>
      <p className="text-lg font-semibold mb-1">Login successful</p>
      <p className="text-white/70 text-sm flex items-center gap-1">
        Rakshak AI is booting
        <span className="inline-flex w-6 justify-start">
          <span className="animate-pulse">...</span>
        </span>
      </p>
    </div>
  )
}

export default function BootingPage() {
  return (
    <Suspense fallback={null}>
      <BootingContent />
    </Suspense>
  )
}
