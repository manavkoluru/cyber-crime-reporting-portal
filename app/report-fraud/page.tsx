'use client'

import Link from 'next/link'
import { useState } from 'react'
import { GovHeader, GovFooter } from '@/app/components/GovHeader'

const CARDS = [
  {
    heading: 'You talk, we listen',
    body: "Describe what happened in your own words — type, speak, or upload screenshots. No forms. RakshakAI picks up the details from your conversation.",
  },
  {
    heading: 'We read your documents',
    body: 'Upload bank statements, UPI screenshots, or any evidence. RakshakAI extracts transaction IDs, amounts, timestamps, and fraud indicators automatically.',
  },
  {
    heading: 'Filed in under 2 minutes',
    body: 'RakshakAI identifies the fraud type, flags urgency, and routes your complaint to the correct department. You get an official complaint number instantly.',
  },
  {
    heading: 'Golden hour? We move fast',
    body: 'If the fraud happened recently, RakshakAI can flag your case as urgent, alert your bank to block suspicious transactions, and trigger the recovery process.',
  },
  {
    heading: 'Your data stays safe',
    body: "We only extract what's needed to file the complaint. Your information is encrypted and handled per government data protection guidelines.",
  },
]

const READY_TAGS = ['Bank statements', 'UPI screenshots', 'Transaction IDs', 'Chat screenshots', 'Fraud emails/SMS']

const TRUST_POINTS = [
  {
    lead: 'Encrypted & secure —',
    detail: 'Your data is encrypted and handled per government data protection guidelines.',
  },
  {
    lead: 'Nothing extra collected —',
    detail: "RakshakAI only extracts details needed for the complaint — nothing else.",
  },
  {
    lead: 'Official record —',
    detail: "You'll receive an official complaint number (CCN) at the end.",
  },
  {
    lead: 'Prefer a person? —',
    detail: 'You can call 1930 at any point if you\'d prefer to speak to a person.',
  },
  {
    lead: 'Account required —',
    detail: "You'll need to log in before filing so your complaint can be tracked with your account.",
  },
]

export default function ReportFraudPage() {
  const [cardIndex, setCardIndex] = useState(0)

  const handlePrev = () => setCardIndex((i) => Math.max(0, i - 1))
  const handleNext = () => setCardIndex((i) => Math.min(CARDS.length - 1, i + 1))

  const activeCard = CARDS[cardIndex]

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Opener */}
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Report your cyber fraud</h2>
          <p className="text-gray-600 text-lg mb-6">
            You&apos;re about to speak with RakshakAI, our fraud reporting agent. It will guide you through filing an
            official cyber crime complaint.
          </p>
          <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#fff4e5] border border-[#FF9933]/30 text-[#0b3d91] text-sm font-medium">
            2 minute read
          </span>
          <div className="mt-4">
            <Link href="/login" className="text-sm text-gray-500 hover:text-[#0b3d91] hover:underline">
              Already know how it works? Skip to login &rarr;
            </Link>
          </div>
        </div>

        {/* Carousel */}
        <div className="max-w-2xl mx-auto mb-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4 text-center">
            What RakshakAI does
          </p>
          <div className="relative bg-white border border-gray-200 shadow-sm rounded-lg p-8 overflow-hidden">
            <span className="absolute top-4 right-6 text-6xl font-bold text-gray-100 select-none">
              {String(cardIndex + 1).padStart(2, '0')}
            </span>
            <div className="relative">
              <h4 className="text-xl font-semibold text-gray-800 mb-3">{activeCard.heading}</h4>
              <p className="text-gray-600">{activeCard.body}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handlePrev}
              disabled={cardIndex === 0}
              className="px-4 py-2 text-sm font-semibold text-[#0b3d91] border border-gray-300 rounded transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Back
            </button>
            <span className="text-sm text-gray-500">
              {cardIndex + 1} / {CARDS.length}
            </span>
            <button
              onClick={handleNext}
              disabled={cardIndex === CARDS.length - 1}
              className="px-4 py-2 text-sm font-semibold text-[#0b3d91] border border-gray-300 rounded transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        </div>

        {/* What to have ready */}
        <div className="max-w-2xl mx-auto mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-2 text-center">What to have ready</h3>
          <p className="text-gray-600 text-center mb-6">Any of these will help speed things up:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {READY_TAGS.map((tag, i) => (
              <span
                key={i}
                className="px-4 py-2 rounded-full bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-500 italic text-center mt-4">
            Don&apos;t worry if you don&apos;t have everything — RakshakAI will ask for what&apos;s needed.
          </p>
        </div>

        {/* Before you continue */}
        <div className="max-w-2xl mx-auto mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Before you continue</h3>
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg divide-y divide-gray-200">
            {TRUST_POINTS.map((point, i) => (
              <p key={i} className="p-4 text-sm">
                <span className="font-semibold text-gray-800">{point.lead}</span>{' '}
                <span className="text-gray-600">{point.detail}</span>
              </p>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-md mx-auto text-center mb-8">
          <Link
            href="/login"
            className="block w-full px-8 py-4 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded-lg shadow-lg transition text-lg"
          >
            Log in and start reporting &rarr;
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

      <GovFooter />
    </div>
  )
}
