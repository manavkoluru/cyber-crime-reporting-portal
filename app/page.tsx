'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GovHeader, GovFooter } from '@/app/components/GovHeader'

interface User {
  userId: string
  username: string
  role: string
  phone?: string
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
        }
      } catch (err) {
        // Not logged in
      }
    }

    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      window.location.reload()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader
        rightSlot={
          user ? (
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800">{user.username}</p>
                <p className="text-xs text-gray-500">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-semibold transition border border-gray-300"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-[#0b3d91] hover:bg-[#0a3480] text-white rounded text-sm font-semibold transition flex-shrink-0"
            >
              Login
            </Link>
          )
        }
      />

      {/* Hero Section */}
      <div className="bg-[#0b3d91] py-16 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">You&apos;re in the right place.</h2>
          <p className="text-blue-100 text-lg sm:text-xl max-w-2xl mx-auto mb-8">
            Cyber fraud can happen to anyone. We&apos;re here to help you act quickly and recover what&apos;s yours.
          </p>
          <div className="flex justify-center mb-4">
            <Link
              href="/report-fraud"
              className="px-8 py-3 bg-[#FF9933] hover:bg-[#e6862b] text-[#0b3d91] font-semibold rounded transition shadow-lg inline-block"
            >
              Report fraud now
            </Link>
          </div>
          <p className="text-blue-200 text-sm">Available 24/7 &middot; Takes under 2 minutes &middot; No forms</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {[
            { label: 'Complaints Processed', value: '2.5M+' },
            { label: 'Amount Recovered', value: '₹850Cr+' },
            { label: 'Active Cases', value: '45K+' },
            { label: 'Response Time', value: '< 24hrs' },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-[#0b3d91]">{stat.value}</div>
              <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">How it works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y divide-gray-200 md:divide-y-0 md:divide-x border-t border-b border-gray-200">
            {[
              {
                step: '1',
                title: 'Tell us what happened',
                desc: 'Chat or speak with our agent in your own words. Share any screenshots or documents — we extract only the details needed to file your complaint.',
              },
              {
                step: '2',
                title: 'Your complaint, filed in under 2 minutes',
                desc: "Powered by GPT-4o, Rakshak AI reads your documents, identifies the fraud type, flags urgency, and routes your case to the right department. Filing time drops from 40+ minutes to under 2.",
              },
              {
                step: '3',
                title: 'Track, protect, recover',
                desc: 'Follow your case in real time with updates from your case officer. Reported within the golden hour? Rakshak AI can flag it as urgent, alert your bank to block suspicious transactions, and trigger the recovery process.',
              },
            ].map((item, i) => (
              <div key={i} className="py-8 px-0 md:px-8 first:pl-0 last:pr-0">
                <div className="text-3xl font-bold text-[#0b3d91] mb-3">{item.step}</div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h4>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">Why Report Here?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Secure & Private',
                desc: 'Your data is encrypted and handled only by government cyber agencies. Rakshak AI never shares your information with anyone else.',
              },
              {
                title: 'Available 24/7',
                desc: 'No office hours, no queues. Rakshak AI is always on — report the moment it happens, day or night.',
              },
              {
                title: 'Backed by a Real Case Officer',
                desc: 'Rakshak AI files your complaint instantly, but a human case officer owns and follows through on your case.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 hover:shadow-md transition border-t-4 border-t-[#0b3d91]"
              >
                <h4 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h4>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-[#fff4e5] border border-[#FF9933]/40 rounded-lg p-8 text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-4">Lost Money to Cyber Fraud?</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto text-lg">
            File a complaint right now. The sooner you report, the higher the chances of recovery. Every minute counts.
          </p>
          <Link
            href="/report-fraud"
            className="px-8 py-4 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded transition shadow-lg inline-block text-lg"
          >
            File Your Complaint Now
          </Link>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">Common Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: 'Is reporting free?',
                a: 'Yes, completely free. Cyber crime reporting is a government service.',
              },
              {
                q: 'How long does it take?',
                a: 'Most complaints are filed in under 2 minutes. Your complaint gets a Cyber Crime Number (CCN) instantly.',
              },
              {
                q: 'Can I track my complaint?',
                a: 'Yes, use your CCN to track status 24/7 on this platform.',
              },
              {
                q: 'Is my data safe?',
                a: 'Yes, all data is encrypted and handled by government cyber agencies only.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                <h4 className="text-gray-800 font-semibold mb-2">{faq.q}</h4>
                <p className="text-gray-600 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Link
            href="/report-fraud"
            className="bg-[#0b3d91] hover:bg-[#0a3480] rounded-lg p-6 text-center transition group"
          >
            <h4 className="text-lg font-semibold text-white mb-2">File a Complaint</h4>
            <p className="text-blue-100 text-sm mb-4">Report cyber fraud instantly — takes under 2 minutes</p>
            <span className="text-white group-hover:underline text-sm font-semibold">Get Started &rarr;</span>
          </Link>

          <Link
            href="/awareness"
            className="bg-[#138808] hover:bg-[#0f6e06] rounded-lg p-6 text-center transition group"
          >
            <h4 className="text-lg font-semibold text-white mb-2">Learn & Protect</h4>
            <p className="text-green-100 text-sm mb-4">Understand cyber threats and prevention tips</p>
            <span className="text-white group-hover:underline text-sm font-semibold">Explore &rarr;</span>
          </Link>

          <a
            href="tel:1930"
            className="bg-[#FF9933] hover:bg-[#e6862b] rounded-lg p-6 text-center transition group"
          >
            <h4 className="text-lg font-semibold text-white mb-2">Call Helpline</h4>
            <p className="text-orange-50 text-sm mb-4">24/7 support. Free. In Hindi & English</p>
            <span className="text-white group-hover:underline text-sm font-semibold">Call 1930 &rarr;</span>
          </a>
        </div>
      </div>

      <GovFooter />
    </div>
  )
}
