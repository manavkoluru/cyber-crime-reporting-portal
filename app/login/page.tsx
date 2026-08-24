'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [loginMode, setLoginMode] = useState<'username' | 'mobile'>('username')

  // Username/Password mode
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // Mobile/OTP mode
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDemo, setShowDemo] = useState(false)

  const demoAccounts = [
    { username: 'victim@example.com', password: 'password123', role: 'Complainant', name: 'Priya Sharma' },
    { username: 'police@bangalore.gov', password: 'police123', role: 'Cyber Police', name: 'Inspector Rajesh (Bangalore East)' },
    { username: 'admin@bangalore.gov', password: 'admin123', role: 'City Admin', name: 'Cyber Crime Head - Bangalore' },
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Login failed')
        setIsLoading(false)
        return
      }

      // Success - redirect to dashboard
      setIsLoading(false)
      router.push('/dashboard')
    } catch (err) {
      setError('Network error. Please try again.')
      setIsLoading(false)
    }
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      setError('Please enter a valid 10-digit mobile number')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to send OTP')
        setIsLoading(false)
        return
      }

      setIsLoading(false)
      setOtpSent(true)
      setError('')
    } catch (err) {
      setError('Network error. Please try again.')
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (otp.length < 4 || otp.length > 6 || !/^\d+$/.test(otp)) {
      setError('Please enter a valid OTP (4-6 digits)')
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Invalid OTP')
        setIsLoading(false)
        return
      }

      // Success - redirect to dashboard
      setIsLoading(false)
      router.push('/dashboard')
    } catch (err) {
      setError('Network error. Please try again.')
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async (account: typeof demoAccounts[0]) => {
    setUsername(account.username)
    setPassword(account.password)
    setShowDemo(false)

    // Auto-submit after a brief delay
    setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: account.username, password: account.password }),
        })

        if (res.ok) {
          router.push('/dashboard')
        }
      } catch (err) {
        setError('Login failed')
      }
    }, 300)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">🛡️</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Cyber Crime Portal</h1>
          <p className="text-slate-400">National Reporting & Response Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-xl">
          {/* Mode Switcher */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setLoginMode('username')
                setError('')
                setOtp('')
                setOtpSent(false)
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                loginMode === 'username'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              👤 Username
            </button>
            <button
              onClick={() => {
                setLoginMode('mobile')
                setError('')
                setUsername('')
                setPassword('')
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                loginMode === 'mobile'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📱 Mobile + OTP
            </button>
          </div>

          {/* Username/Password Form */}
          {loginMode === 'username' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Username / Email</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          {/* Mobile/OTP Form */}
          {loginMode === 'mobile' && (
            <>
              {!otpSent ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  {error && (
                    <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Mobile Number</label>
                    <div className="flex gap-2">
                      <span className="px-4 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-400 flex items-center">
                        +91
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Enter 10-digit number"
                        maxLength={10}
                        className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">OTP will be sent to this number</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || phone.length !== 10}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition"
                  >
                    {isLoading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  {error && (
                    <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Enter OTP</label>
                    <p className="text-xs text-slate-400 mb-3">
                      OTP sent to +91-{phone.slice(0, 5)}****
                    </p>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter 4-6 digit OTP"
                      maxLength={6}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-600 text-center font-mono text-lg tracking-widest"
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otp.length < 4}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition"
                  >
                    {isLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false)
                      setOtp('')
                      setError('')
                    }}
                    disabled={isLoading}
                    className="w-full text-slate-300 hover:text-white text-sm font-medium transition"
                  >
                    ← Back to Phone Number
                  </button>
                </form>
              )}
            </>
          )}

          {/* Demo Section - Only for Username Mode */}
          {loginMode === 'username' && (
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <button
                onClick={() => setShowDemo(!showDemo)}
                className="w-full text-slate-300 hover:text-white text-sm font-medium transition"
              >
                {showDemo ? '← Hide Demo Accounts' : '👤 Demo Accounts'}
              </button>

              {showDemo && (
                <div className="mt-4 space-y-2">
                  {demoAccounts.map((account, i) => (
                    <button
                      key={i}
                      onClick={() => handleDemoLogin(account)}
                      className="w-full text-left p-3 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 rounded-lg transition"
                    >
                      <div className="text-sm font-medium text-slate-200">{account.role}</div>
                      <div className="text-xs text-slate-400">{account.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{account.username}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-slate-400 text-sm">
          <p>🆘 Emergency? Call <strong className="text-slate-300">1930</strong> (24/7 Helpline)</p>
        </div>
      </div>
    </div>
  )
}
