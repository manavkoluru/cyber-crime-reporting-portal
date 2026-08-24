'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Awareness() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user has valid session
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
        if (!res.ok) {
          // No valid session, redirect to login
          router.push('/login')
          return
        }
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Session check failed:', error)
        router.push('/login')
      }
    }

    checkSession()
  }, [router])
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/dashboard'
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const threatTypes = [
    {
      icon: '📱',
      title: 'UPI Fraud',
      desc: 'Fraudulent transactions through payment apps',
      signs: ['Unexpected payment requests', 'Fake UPI links', 'Requests from unknown contacts'],
      prevention: 'Never share OTP, enable app lock, verify receiver details',
    },
    {
      icon: '🎣',
      title: 'Phishing',
      desc: 'Fraudulent emails/messages to steal credentials',
      signs: ['Suspicious sender emails', 'Urgent action requests', 'Unusual links or attachments'],
      prevention: 'Verify sender identity, never click suspicious links, use email filters',
    },
    {
      icon: '🛒',
      title: 'E-Commerce Scams',
      desc: 'Fake products or non-delivery of goods',
      signs: ['Unrealistic prices', 'New sellers with no reviews', 'Pressure to pay immediately'],
      prevention: 'Use trusted platforms, check seller ratings, use secure payment methods',
    },
    {
      icon: '👤',
      title: 'Identity Theft',
      desc: 'Misuse of personal information',
      signs: ['Fake social media accounts', 'Requests for personal documents', 'Unknown transactions'],
      prevention: 'Limit personal info online, monitor credit, use strong passwords',
    },
    {
      icon: '☎️',
      title: 'Social Engineering',
      desc: 'Manipulation to reveal sensitive information',
      signs: ['Caller pretending to be from bank/authority', 'Urgent money demands', 'Threats'],
      prevention: 'Verify caller identity independently, never share OTP/pins, hang up and call back',
    },
    {
      icon: '💰',
      title: 'Investment Scams',
      desc: 'Promises of unrealistic returns on investments',
      signs: ['Guaranteed high returns', 'Pressure to invest quickly', 'Unregistered operators'],
      prevention: 'Verify investment operator registration, get documents in writing, be skeptical',
    },
  ]

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-950/50 border-b border-slate-700/50 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              title="Go back"
            >
              ← Back
            </button>
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-lg">
                <span className="text-2xl">🛡️</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Cyber Awareness</h1>
                <p className="text-xs text-slate-400">Learn to protect yourself</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <a href="tel:1930" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">
              📞 1930
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Protect Yourself from Cyber Fraud</h2>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Knowledge is your best defense. Learn about common cyber threats and how to prevent them.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Threat Types Grid */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-white mb-8">Common Cyber Threats</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {threatTypes.map((threat, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/80 transition group"
              >
                <div className="text-4xl mb-3">{threat.icon}</div>
                <h4 className="text-xl font-semibold text-white mb-2">{threat.title}</h4>
                <p className="text-slate-400 text-sm mb-4">{threat.desc}</p>

                <div className="space-y-3 mb-4 pb-4 border-b border-slate-700/50">
                  <p className="text-xs text-slate-500 font-semibold">⚠️ Warning Signs:</p>
                  <ul className="space-y-1">
                    {threat.signs.map((sign, j) => (
                      <li key={j} className="text-slate-300 text-xs flex items-start gap-2">
                        <span className="text-red-400 mt-1">•</span>
                        <span>{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-xs text-slate-500 font-semibold mb-2">✓ Prevention:</p>
                <p className="text-slate-300 text-xs">{threat.prevention}</p>
              </div>
            ))}
          </div>
        </div>

        {/* General Tips */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 mb-16">
          <h3 className="text-2xl font-bold text-white mb-6">General Safety Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: '🔐', title: 'Use Strong Passwords', desc: 'Use unique, complex passwords with mix of letters, numbers, symbols' },
              { icon: '📲', title: 'Enable 2FA', desc: 'Enable two-factor authentication on all important accounts' },
              { icon: '🔔', title: 'Monitor Accounts', desc: 'Regularly check bank statements and credit reports' },
              { icon: '⚙️', title: 'Update Software', desc: 'Keep apps and OS updated to patch security vulnerabilities' },
              { icon: '🚫', title: 'Verify URLs', desc: 'Always check URLs before entering sensitive information' },
              { icon: '📧', title: 'Be Skeptical', desc: 'Never trust unexpected emails/calls requesting personal data' },
            ].map((tip, i) => (
              <div key={i} className="bg-slate-750/50 border border-slate-700/50 rounded-lg p-4">
                <div className="text-3xl mb-2">{tip.icon}</div>
                <h4 className="font-semibold text-white mb-1">{tip.title}</h4>
                <p className="text-slate-400 text-sm">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What To Do If Scammed */}
        <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-700/50 rounded-2xl p-8 mb-16">
          <h3 className="text-2xl font-bold text-white mb-6">🚨 If You've Been Scammed</h3>
          <ol className="space-y-4">
            {[
              'Stop all communication with the scammer immediately',
              'Gather all evidence (screenshots, messages, transaction details)',
              'Notify your bank/payment app and block the scammer',
              'File a complaint with Cyber Crime Portal immediately',
              'Report to your local police station with complaint reference (CCN)',
              'Monitor your credit and bank accounts for suspicious activity',
              'Contact National Helpline: 1930 (24/7, Free)',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <p className="text-slate-300 pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600/20 to-blue-700/20 border border-blue-600/50 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Experienced Fraud?</h3>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            Don't delay. File a complaint immediately using our AI-powered platform. The sooner you report, the higher the chances of recovery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chat"
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
            >
              File Complaint Now
            </Link>
            <a
              href="tel:1930"
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
            >
              Call 1930 Helpline
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
