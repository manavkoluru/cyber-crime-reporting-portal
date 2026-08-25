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
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">National Cyber Crime Reporting Portal</h2>
          <p className="text-blue-100 text-lg sm:text-xl max-w-2xl mx-auto mb-8">
            File your complaint in under 2 minutes. Instant guidance, real-time tracking, available 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chat"
              className="px-8 py-3 bg-[#FF9933] hover:bg-[#e6862b] text-white font-semibold rounded transition shadow-lg inline-block"
            >
              Report Fraud Now
            </Link>
            <a
              href="tel:1930"
              className="px-8 py-3 bg-white hover:bg-gray-100 text-[#0b3d91] font-semibold rounded transition inline-block"
            >
              Call 1930 Helpline (24/7)
            </a>
          </div>
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

        {/* Features Grid */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">Why Report Here?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Instant Guided Filing',
                desc: 'We guide you step by step — most complaints filed in under 2 minutes.',
              },
              {
                title: 'Screenshot Analysis',
                desc: 'Upload your transaction screenshot and we pull out all the details automatically.',
              },
              {
                title: 'Golden Hour Detection',
                desc: 'Get instant alerts if your fraud is within 2 hours – maximum recovery window.',
              },
              {
                title: 'Mobile Friendly',
                desc: 'File complaints on any device, anywhere, anytime. No installation needed.',
              },
              {
                title: 'Real-Time Tracking',
                desc: 'Track your complaint status live and get updates via SMS/call.',
              },
              {
                title: 'Secure & Private',
                desc: 'Your data is encrypted and handled by government cyber agencies.',
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

        {/* How It Works */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8 mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">How It Works – 3 Simple Steps</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Upload Screenshot',
                desc: 'Share a screenshot of your transaction or fraud. We read it and pull out the details instantly.',
              },
              {
                step: '2',
                title: 'Answer Questions',
                desc: 'Provide any missing details. Our assistant asks only what\'s necessary.',
              },
              {
                step: '3',
                title: 'Get CCN',
                desc: 'Receive your Cyber Crime Number (CCN) instantly. Track your case anytime.',
              },
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[#0b3d91] text-white font-bold text-lg">
                      {item.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-800 mb-2">{item.title}</h4>
                    <p className="text-gray-600">{item.desc}</p>
                  </div>
                </div>
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
            href="/chat"
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
            href="/chat"
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
