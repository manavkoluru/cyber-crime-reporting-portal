'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAllComplaints, getComplaintsByPhone } from '@/lib/store'

interface Complaint {
  id: string
  ccn: string
  amount: number
  receiver: string
  utr: string
  complainantPhone: string
  timestamp: Date
  status: string
  paymentPlatform: string
}

export default function TrackComplaint() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [step, setStep] = useState<'phone' | 'otp' | 'results'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [verifiedPhone, setVerifiedPhone] = useState('')
  const [complaints, setComplaints] = useState<Complaint[]>([])

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

  const handlePhoneSubmit = () => {
    if (phone.match(/^\d{10}$/)) {
      setStep('otp')
    }
  }

  const handleOTPSubmit = () => {
    if (otp.match(/^\d{4,6}$/)) {
      // Verify and fetch complaints
      const all = getAllComplaints()
      const userComplaints = all
        .filter(c => c.complainantPhone === phone)
        .map(c => ({
          ...c,
          timestamp: new Date(c.timestamp),
        })) as Complaint[]

      setComplaints(userComplaints)
      setVerifiedPhone(phone)
      setStep('results')
    }
  }

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

  const handleReset = () => {
    setStep('phone')
    setPhone('')
    setOtp('')
    setVerifiedPhone('')
    setComplaints([])
    setSelectedComplaint(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FILED':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'INVESTIGATING':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'RESOLVED':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'REJECTED':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'FILED':
        return '📋'
      case 'INVESTIGATING':
        return '🔍'
      case 'RESOLVED':
        return '✅'
      case 'REJECTED':
        return '❌'
      default:
        return '⏳'
    }
  }

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
                <h1 className="text-xl font-bold text-white">Track Complaint</h1>
                <p className="text-xs text-slate-400">Monitor your case status</p>
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

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {step === 'phone' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Track Your Complaint</h2>
            <p className="text-slate-400 mb-6">Enter your registered phone number to view all your complaints</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Registered Phone Number</label>
                <input
                  type="tel"
                  placeholder="10-digit phone number..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-red-500/50 text-lg tracking-widest"
                />
                <p className="text-slate-500 text-xs mt-1">Format: 10 digits</p>
              </div>

              <button
                onClick={handlePhoneSubmit}
                disabled={!phone.match(/^\d{10}$/)}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                Send OTP
              </button>
            </div>
          </div>
        )}

        {step === 'otp' && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Verify Your Phone</h2>
            <p className="text-slate-400 mb-6">OTP sent to +91-{phone.slice(-4).padStart(10, '*')}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">Enter OTP (4-6 digits)</label>
                <input
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-red-500/50 text-center text-2xl tracking-widest font-mono"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleOTPSubmit}
                  disabled={!otp.match(/^\d{4,6}$/)}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
                >
                  Verify
                </button>
                <button
                  onClick={() => {
                    setStep('phone')
                    setOtp('')
                  }}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'results' && (
          <>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Your Complaints</h2>
                  <p className="text-slate-400">Phone: +91-{verifiedPhone.slice(0, 5)}{verifiedPhone.slice(5).replace(/./g, '*')}</p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                >
                  Change Number
                </button>
              </div>
            </div>

            {/* Complaints List */}
            {complaints.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">📭</div>
                <h3 className="text-xl font-semibold text-white mb-2">No Complaints Found</h3>
                <p className="text-slate-400 mb-6">You haven't filed any complaints yet.</p>
                <Link
                  href="/chat"
                  className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                >
                  File New Complaint
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">
                    {complaints.length} Complaint{complaints.length !== 1 ? 's' : ''} Found
                  </h3>
                </div>

                {complaints.map((complaint) => (
              <div
                key={complaint.id}
                onClick={() => setSelectedComplaint(complaint)}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/80 hover:bg-slate-750/50 transition cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="bg-slate-900 text-green-400 px-3 py-1 rounded text-sm font-mono">
                        {complaint.ccn}
                      </code>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(complaint.status)}`}>
                        {getStatusEmoji(complaint.status)} {complaint.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Filed: {new Date(complaint.timestamp).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">₹{complaint.amount.toLocaleString()}</div>
                    <p className="text-slate-400 text-xs">{complaint.paymentPlatform}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs">Transaction ID</p>
                    <p className="text-white font-mono">{complaint.utr}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Receiver</p>
                    <p className="text-white truncate">{complaint.receiver}</p>
                  </div>
                </div>

                <button className="w-full mt-4 py-2 bg-slate-700 group-hover:bg-slate-600 text-white font-semibold rounded-lg transition">
                  View Details →
                </button>
              </div>
                ))}
              </div>
            )}

            {/* Selected Complaint Details */}
            {selectedComplaint && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-700/50 rounded-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="sticky top-0 bg-slate-900 border-b border-slate-700/50 p-6 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">Complaint Details</h3>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* CCN and Status */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm mb-2">Cyber Crime Number</p>
                  <code className="text-green-400 text-xl font-mono font-bold">{selectedComplaint.ccn}</code>
                  <div className="mt-4">
                    <p className="text-slate-400 text-sm mb-2">Current Status</p>
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(selectedComplaint.status)}`}>
                      {getStatusEmoji(selectedComplaint.status)} {selectedComplaint.status}
                    </span>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-2">Amount</p>
                    <p className="text-2xl font-bold text-white">₹{selectedComplaint.amount.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <p className="text-slate-400 text-xs mb-2">Platform</p>
                    <p className="text-lg font-semibold text-white">{selectedComplaint.paymentPlatform}</p>
                  </div>
                </div>

                {/* Transaction ID */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-2">Transaction ID / UTR</p>
                  <code className="text-white font-mono break-all">{selectedComplaint.utr}</code>
                </div>

                {/* Receiver */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-2">Receiver VPA / Account</p>
                  <p className="text-white">{selectedComplaint.receiver}</p>
                </div>

                {/* Timeline */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-3">Timeline</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-white font-semibold">Complaint Filed</p>
                        <p className="text-slate-400 text-sm">{new Date(selectedComplaint.timestamp).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                  >
                    Close
                  </button>
                  <a
                    href="tel:1930"
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition text-center"
                  >
                    Call 1930
                  </a>
                </div>
              </div>
            </div>
            </div>
            )}

            {/* Footer CTA */}
            {complaints.length > 0 && (
              <div className="mt-12 bg-gradient-to-r from-red-600/20 to-red-700/20 border border-red-600/50 rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold text-white mb-3">Need More Help?</h3>
                <p className="text-slate-300 mb-6">Our support team is available 24/7 to assist you.</p>
                <a href="tel:1930" className="inline-block px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition">
                  Call 1930 Helpline
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
