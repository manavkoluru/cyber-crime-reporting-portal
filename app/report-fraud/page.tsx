'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { GovHeader, GovFooter } from '@/app/components/GovHeader'

const CARDS = [
  {
    heading: 'Just tell us what happened',
    body: "You'll chat with Rakshak AI the way you'd explain it to a human. Type, speak, and just upload any supporting documents. There's no form to fill and no wrong way to describe it.",
  },
  {
    heading: "We pull the details so you don't have to",
    body: "If you share screenshots, bank statements, or messages, Rakshak AI reads them and extracts what's needed — transaction IDs, amounts, timestamps, account numbers. You won't be asked to type out things that are already in your documents.",
  },
  {
    heading: 'Your case gets automatically categorized and routed',
    body: "Based on what you've shared, Rakshak AI identifies the type of fraud, assesses how time-sensitive it is, and assigns your complaint to the correct department.",
  },
  {
    heading: 'If time is critical, we act immediately',
    body: 'If the fraud happened in the last few hours, Rakshak AI flags your complaint as urgent and can trigger the golden hour recovery process, including alerting your bank to block suspicious transactions.',
  },
  {
    heading: 'You are in control',
    body: "Rakshak AI will never file a complaint, lock accounts, or execute any action without your explicit permission and confirmation. At the end of the conversation, you'll receive an official complaint number (CCN). You can use it to track your case, follow up with your bank, or reference it if you call 1930.",
  },
]

const READY_TAGS = ['Bank statements', 'UPI screenshots', 'Transaction IDs', 'Chat screenshots', 'Fraud emails/SMS']

const TRUST_POINTS = [
  'Your data is encrypted and handled per government data protection guidelines.',
  "Rakshak AI only extracts details needed for the complaint — nothing else.",
  "You'll receive an official complaint number (CCN) at the end.",
  "You can call 1930 at any point if you'd prefer to speak to a person.",
  "You'll need to log in before filing so your complaint can be tracked with your account.",
]

const ANIMATION_MS = 250

export default function ReportFraudPage() {
  const [cardIndex, setCardIndex] = useState(0)
  const [exiting, setExiting] = useState<'left' | 'right' | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
      .then((res) => setIsAuthenticated(res.ok))
      .catch(() => setIsAuthenticated(false))
  }, [])

  const reportHref = isAuthenticated ? '/chat' : '/login?next=/chat'

  const goTo = (nextIndex: number, direction: 'left' | 'right') => {
    if (exiting || nextIndex < 0 || nextIndex > CARDS.length - 1) return
    setExiting(direction)
    setTimeout(() => {
      setCardIndex(nextIndex)
      setExiting(null)
    }, ANIMATION_MS)
  }

  const handlePrev = () => goTo(cardIndex - 1, 'right')
  const handleNext = () => goTo(cardIndex + 1, 'left')

  const activeCard = CARDS[cardIndex]
  const progressPct = ((cardIndex + 1) / CARDS.length) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader />

      {/* Page banner */}
      <div className="bg-gray-100 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">Report your cyber fraud</h1>
            <p className="text-lg text-gray-700 mb-6">
              Rakshak AI is an AI-powered government assistant for reporting cybercrime. It guides you through
              filing an official complaint. Currently, it supports financial crime complaints, which require an
              authenticated account.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="#how-it-works"
                className="inline-block px-6 py-3 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded transition"
              >
                Continue reading
              </Link>
              <span className="text-sm text-gray-400">2 minute read</span>
            </div>
            <Link
              href={reportHref}
              className="inline-block mt-3 text-sm text-gray-400 underline underline-offset-2 hover:text-gray-600 transition"
            >
              Skip and start reporting
            </Link>
            <p className="text-sm text-gray-500 mt-6">Last updated 26 August 2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl">
          {/* Carousel */}
          <div id="how-it-works" className="mb-6 scroll-mt-24">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">How it works</h3>
            <div className="relative bg-white border-2 border-[#0b3d91] shadow-lg rounded-lg p-8 pt-14 overflow-hidden">
              <span className="absolute top-4 right-6 text-6xl font-bold text-gray-100 select-none">
                {String(cardIndex + 1).padStart(2, '0')}
              </span>

              <button
                onClick={handlePrev}
                disabled={cardIndex === 0 || !!exiting}
                aria-label="Previous"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-gray-300 bg-white flex items-center justify-center text-[#0b3d91] font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 z-10"
              >
                &larr;
              </button>
              <button
                onClick={handleNext}
                disabled={cardIndex === CARDS.length - 1 || !!exiting}
                aria-label="Next"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full border border-gray-300 bg-white flex items-center justify-center text-[#0b3d91] font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 z-10"
              >
                &rarr;
              </button>

              <div
                key={cardIndex}
                className="relative px-8 min-h-[180px] sm:min-h-[150px] transition-all ease-out"
                style={{
                  transitionDuration: `${ANIMATION_MS}ms`,
                  transform: exiting
                    ? `translateX(${exiting === 'left' ? '-40px' : '40px'})`
                    : 'translateX(0)',
                  opacity: exiting ? 0 : 1,
                }}
              >
                <h4 className="text-xl font-semibold text-gray-800 mb-3">{activeCard.heading}</h4>
                <p className="text-gray-600">{activeCard.body}</p>
              </div>
            </div>

            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-4 overflow-hidden">
              <div
                className="h-full bg-[#0b3d91] rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <hr className="border-t border-gray-200 mb-6" />

        </div>

        {/* What to have ready */}
        <div className="mb-6">
          <div className="max-w-3xl">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">What to have ready</h3>
            <p className="text-gray-600 mb-6">Any of these will help speed things up:</p>
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-2 sm:gap-x-3">
            {READY_TAGS.map((tag, i) => (
              <span
                key={i}
                className="px-3 sm:px-4 py-2 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium whitespace-nowrap"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-500 italic mt-4 max-w-3xl">
            Don&apos;t worry if you don&apos;t have everything — Rakshak AI will ask for what&apos;s needed.
          </p>
        </div>

        <div className="max-w-3xl">
          <hr className="border-t border-gray-200 mb-6" />

          {/* Before you continue */}
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6">Before you continue</h3>
            <div className="space-y-3">
              {TRUST_POINTS.map((point, i) => (
                <p key={i} className="text-sm text-gray-600 flex items-start gap-2">
                  <span aria-hidden="true">✅</span>
                  <span>{point}</span>
                </p>
              ))}
            </div>
          </div>

          <hr className="border-t border-gray-200 mb-6" />

          {/* CTA */}
          <div className="mb-8">
            <Link
              href={reportHref}
              className="inline-block px-8 py-4 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded-lg shadow-lg transition text-lg"
            >
              Continue to report fraud &rarr;
            </Link>
            <p className="text-sm text-gray-500 mt-3">
              Prefer to call? Dial{' '}
              <a href="tel:1930" className="underline hover:text-[#0b3d91]">
                1930
              </a>{' '}
              anytime
            </p>
          </div>
        </div>
      </div>

      <GovFooter />
    </div>
  )
}
