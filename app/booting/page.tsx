'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BootingScreen, BOOT_MS } from '@/app/components/BootingScreen'

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

  return <BootingScreen heading="Login successful" />
}

export default function BootingPage() {
  return (
    <Suspense fallback={null}>
      <BootingContent />
    </Suspense>
  )
}
