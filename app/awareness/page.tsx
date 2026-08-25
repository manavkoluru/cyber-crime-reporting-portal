'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GovHeader, GovFooter } from '@/app/components/GovHeader'

export default function Awareness() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
        if (!res.ok) {
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
      title: 'UPI Fraud',
      desc: 'Fraudulent transactions through payment apps',
      signs: ['Unexpected payment requests', 'Fake UPI links', 'Requests from unknown contacts'],
      prevention: 'Never share OTP, enable app lock, verify receiver details',
    },
    {
      title: 'Phishing',
      desc: 'Fraudulent emails/messages to steal credentials',
      signs: ['Suspicious sender emails', 'Urgent action requests', 'Unusual links or attachments'],
      prevention: 'Verify sender identity, never click suspicious links, use email filters',
    },
    {
      title: 'E-Commerce Scams',
      desc: 'Fake products or non-delivery of goods',
      signs: ['Unrealistic prices', 'New sellers with no reviews', 'Pressure to pay immediately'],
      prevention: 'Use trusted platforms, check seller ratings, use secure payment methods',
    },
    {
      title: 'Identity Theft',
      desc: 'Misuse of personal information',
      signs: ['Fake social media accounts', 'Requests for personal documents', 'Unknown transactions'],
      prevention: 'Limit personal info online, monitor credit, use strong passwords',
    },
    {
      title: 'Social Engineering',
      desc: 'Manipulation to reveal sensitive information',
      signs: ['Caller pretending to be from bank/authority', 'Urgent money demands', 'Threats'],
      prevention: 'Verify caller identity independently, never share OTP/pins, hang up and call back',
    },
    {
      title: 'Investment Scams',
      desc: 'Promises of unrealistic returns on investments',
      signs: ['Guaranteed high returns', 'Pressure to invest quickly', 'Unregistered operators'],
      prevention: 'Verify investment operator registration, get documents in writing, be skeptical',
    },
  ]

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader
        title="Cyber Awareness"
        rightSlot={
          <div className="flex items-center gap-3 flex-shrink-0">
            <a href="tel:1930" className="px-4 py-2 bg-[#FF9933] hover:bg-[#e6862b] text-white rounded text-sm font-semibold">
              1930
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        }
      />

      {/* Hero Section */}
      <div className="bg-[#0b3d91] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Protect Yourself from Cyber Fraud</h2>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            Knowledge is your best defense. Learn about common cyber threats and how to prevent them.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Threat Types Grid */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-8">Common Cyber Threats</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {threatTypes.map((threat, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 hover:shadow-md transition border-t-4 border-t-[#0b3d91]"
              >
                <h4 className="text-xl font-semibold text-gray-800 mb-2">{threat.title}</h4>
                <p className="text-gray-500 text-sm mb-4">{threat.desc}</p>

                <div className="space-y-3 mb-4 pb-4 border-b border-gray-200">
                  <p className="text-xs text-gray-500 font-semibold">Warning Signs:</p>
                  <ul className="space-y-1">
                    {threat.signs.map((sign, j) => (
                      <li key={j} className="text-gray-600 text-xs flex items-start gap-2">
                        <span className="text-[#FF9933] mt-1">•</span>
                        <span>{sign}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-xs text-gray-500 font-semibold mb-2">Prevention:</p>
                <p className="text-gray-600 text-xs">{threat.prevention}</p>
              </div>
            ))}
          </div>
        </div>

        {/* General Tips */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">General Safety Tips</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Use Strong Passwords', desc: 'Use unique, complex passwords with mix of letters, numbers, symbols' },
              { title: 'Enable 2FA', desc: 'Enable two-factor authentication on all important accounts' },
              { title: 'Monitor Accounts', desc: 'Regularly check bank statements and credit reports' },
              { title: 'Update Software', desc: 'Keep apps and OS updated to patch security vulnerabilities' },
              { title: 'Verify URLs', desc: 'Always check URLs before entering sensitive information' },
              { title: 'Be Skeptical', desc: 'Never trust unexpected emails/calls requesting personal data' },
            ].map((tip, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-1">{tip.title}</h4>
                <p className="text-gray-600 text-sm">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What To Do If Scammed */}
        <div className="bg-[#fff4e5] border border-[#FF9933]/40 rounded-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">If You&apos;ve Been Scammed</h3>
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
                <div className="flex-shrink-0 w-8 h-8 bg-[#0b3d91] text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <p className="text-gray-700 pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA Section */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Experienced Fraud?</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Don&apos;t delay. File a complaint immediately — it takes under 2 minutes. The sooner you report, the higher the chances of recovery.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chat"
              className="px-8 py-3 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded transition"
            >
              File Complaint Now
            </Link>
            <a
              href="tel:1930"
              className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-semibold rounded transition"
            >
              Call 1930 Helpline
            </a>
          </div>
        </div>
      </div>

      <GovFooter />
    </div>
  )
}
