'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface User {
  userId: string
  username: string
  role: string
  phone?: string
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
        }
      } catch (err) {
        // Not logged in
      } finally {
        setIsLoading(false)
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-950/50 border-b border-slate-700/50 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
            <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-lg">
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Cyber Crime Portal</h1>
              <p className="text-xs text-slate-400">National Reporting & Response Platform</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-white">{user.username}</p>
                  <p className="text-xs text-slate-400">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition"
                >
                  🚪 Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
              >
                🔐 Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-4">Cyber Crime Reporting Portal</h2>
          <p className="text-slate-300 text-xl max-w-2xl mx-auto mb-8">
            AI-powered platform for instant cyber fraud reporting, complaint tracking, and real-time guidance. Available 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chat"
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition shadow-lg inline-block"
            >
              🚀 Report Fraud Now
            </Link>
            <a
              href="tel:1930"
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition inline-block"
            >
              📞 Call 1930 Helpline (24/7)
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {[
            { icon: '📋', label: 'Complaints Processed', value: '2.5M+' },
            { icon: '💰', label: 'Amount Recovered', value: '₹850Cr+' },
            { icon: '⚖️', label: 'Active Cases', value: '45K+' },
            { icon: '⚡', label: 'Response Time', value: '< 24hrs' },
          ].map((stat, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center">
              <div className="text-4xl mb-3">{stat.icon}</div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-white mb-8 text-center">Why Report Here?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🤖',
                title: 'AI-Powered Assistance',
                desc: 'Our intelligent assistant guides you through filing a complaint in just 3 steps.',
              },
              {
                icon: '📸',
                title: 'Screenshot Analysis',
                desc: 'Upload your transaction screenshot and our AI extracts all details automatically.',
              },
              {
                icon: '🔥',
                title: 'Golden Hour Detection',
                desc: 'Get instant alerts if your fraud is within 2 hours – maximum recovery window.',
              },
              {
                icon: '📱',
                title: 'Mobile Friendly',
                desc: 'File complaints on any device, anywhere, anytime. No installation needed.',
              },
              {
                icon: '🔍',
                title: 'Real-Time Tracking',
                desc: 'Track your complaint status live and get updates via SMS/call.',
              },
              {
                icon: '🛡️',
                title: 'Secure & Private',
                desc: 'Your data is encrypted and handled by government cyber agencies.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/80 transition"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 mb-16">
          <h3 className="text-3xl font-bold text-white mb-8 text-center">How It Works – 3 Simple Steps</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Upload Screenshot',
                desc: 'Share a screenshot of your transaction or fraud. Our AI analyzes it instantly.',
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
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-red-600 text-white font-bold text-lg">
                      {item.step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white mb-2">{item.title}</h4>
                    <p className="text-slate-400">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-red-600/20 to-red-700/20 border border-red-600/50 rounded-2xl p-8 text-center mb-16">
          <h3 className="text-3xl font-bold text-white mb-4">Lost Money to Cyber Fraud?</h3>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto text-lg">
            File a complaint right now. The sooner you report, the higher the chances of recovery. Every minute counts.
          </p>
          <Link
            href="/chat"
            className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition shadow-lg inline-block text-lg"
          >
            🚀 File Your Complaint Now
          </Link>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-white mb-8 text-center">Common Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: 'Is reporting free?',
                a: 'Yes, completely free. Cyber crime reporting is a government service.',
              },
              {
                q: 'How long does it take?',
                a: 'Filing takes 3-5 minutes. Your complaint gets a Cyber Crime Number (CCN) instantly.',
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
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                <h4 className="text-white font-semibold mb-2">{faq.q}</h4>
                <p className="text-slate-400 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Link
            href="/chat"
            className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border border-red-600 rounded-xl p-6 text-center transition group"
          >
            <div className="text-4xl mb-3">🚨</div>
            <h4 className="text-lg font-semibold text-white mb-2">File a Complaint</h4>
            <p className="text-red-100 text-sm mb-4">Report cyber fraud instantly with AI assistance</p>
            <span className="text-red-200 group-hover:text-red-100 text-sm font-semibold">Get Started →</span>
          </Link>

          <Link
            href="/awareness"
            className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border border-purple-600 rounded-xl p-6 text-center transition group"
          >
            <div className="text-4xl mb-3">📚</div>
            <h4 className="text-lg font-semibold text-white mb-2">Learn & Protect</h4>
            <p className="text-purple-100 text-sm mb-4">Understand cyber threats and prevention tips</p>
            <span className="text-purple-200 group-hover:text-purple-100 text-sm font-semibold">Explore →</span>
          </Link>

          <a
            href="tel:1930"
            className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border border-blue-600 rounded-xl p-6 text-center transition group"
          >
            <div className="text-4xl mb-3">📞</div>
            <h4 className="text-lg font-semibold text-white mb-2">Call Helpline</h4>
            <p className="text-blue-100 text-sm mb-4">24/7 support. Free. In Hindi & English</p>
            <span className="text-blue-200 group-hover:text-blue-100 text-sm font-semibold">Call 1930 →</span>
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-700/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
          <p>&copy; 2026 National Cyber Crime Reporting Portal. All rights reserved.</p>
          <p className="mt-2">Ministry of Interior | Government of India</p>
        </div>
      </footer>
    </div>
  )
}
