'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { TopStrip } from '@/app/components/GovHeader'

function LoginPageContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  // /chat renders its own "booting" transition, so go there directly. Other
  // destinations still get the standalone /booting screen post-login.
  const destination = next
    ? next === '/chat'
      ? '/chat'
      : `/booting?next=${encodeURIComponent(next)}`
    : '/'
  const [loginMode, setLoginMode] = useState<'username' | 'mobile'>('mobile')
  const [imgOk, setImgOk] = useState(false)

  // Username/Password mode
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Mobile/OTP mode
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDemo, setShowDemo] = useState(false)

  const demoAccounts = [
    { username: 'victim@example.com', password: 'Rakshak-Demo-7fK92m', role: 'Complainant', name: 'Priya Sharma' },
    { username: 'police@bangalore.gov', password: 'Rakshak-Police-3pR58w', role: 'Cyber Police', name: 'Inspector Rajesh (Bangalore East)' },
    { username: 'police_west@bangalore.gov', password: 'Rakshak-Police-3pR58w', role: 'Cyber Police', name: 'Inspector Anjali (Bangalore West)' },
    { username: 'admin@bangalore.gov', password: 'Rakshak-Admin-9xQ41v', role: 'City Admin', name: 'Cyber Crime Head - Bangalore' },
    { username: 'admin@karnataka.gov', password: 'Rakshak-Admin-9xQ41v', role: 'State Cyber Admin', name: 'State Cyber Admin - Karnataka' },
  ]

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    // Guard against browser autofill + stray Enter submitting an empty form.
    if (isLoading || !username.trim() || !password) {
      if (!username.trim() || !password) setError('Enter username and password')
      return
    }
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'same-origin',
        cache: 'no-store',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Login failed')
        setIsLoading(false)
        return
      }

      await res.json().catch(() => null)
      // Full-document navigation so the session cookie is committed before the
      // destination page's SessionGuard checks /api/auth/me (avoids the loop).
      window.location.assign(destination)
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
        credentials: 'same-origin',
        cache: 'no-store',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Invalid OTP')
        setIsLoading(false)
        return
      }

      await res.json().catch(() => null)
      // Full-document navigation so the session cookie is committed before the
      // destination page's SessionGuard checks /api/auth/me (avoids the loop).
      window.location.assign(destination)
    } catch (err) {
      setError('Network error. Please try again.')
      setIsLoading(false)
    }
  }

  // Demo accounts only PREFILL the username/password fields. The user must then
  // press the Login button, which runs handleLogin with this state. This keeps
  // the flow explicit — no click ever auto-submits or auto-redirects.
  const handleDemoSelect = (account: typeof demoAccounts[0]) => {
    setUsername(account.username)
    setPassword(account.password)
    setError('')
    setShowDemo(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TopStrip />
      <div className="w-full h-1.5 flex flex-shrink-0">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            {imgOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/images/emblem-india.png"
                alt="Emblem of India"
                width={64}
                height={64}
                className="w-16 h-16 object-contain mx-auto mb-4"
                onError={() => setImgOk(false)}
              />
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-[#0b3d91] mb-4">
                <span className="text-2xl text-[#0b3d91] font-bold">GOI</span>
              </div>
            )}
            <p className="text-[#0b3d91] font-bold text-lg">राष्ट्रीय साइबर अपराध रिपोर्टिंग पोर्टल</p>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">National Cyber Crime Reporting Portal</h1>
            <p className="text-gray-500 text-sm">Ministry of Home Affairs, Government of India</p>
          </div>

          {/* Login Card */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8">
            {/* Mode Switcher */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => {
                  setLoginMode('mobile')
                  setError('')
                  setUsername('')
                  setPassword('')
                }}
                className={`flex-1 py-2 rounded font-medium transition ${
                  loginMode === 'mobile'
                    ? 'bg-[#0b3d91] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Mobile + OTP
              </button>
              <button
                onClick={() => {
                  setLoginMode('username')
                  setError('')
                  setOtp('')
                  setOtpSent(false)
                }}
                className={`flex-1 py-2 rounded font-medium transition ${
                  loginMode === 'username'
                    ? 'bg-[#0b3d91] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Staff / Demo Login
              </button>
            </div>

            {/* Username/Password Form */}
            {loginMode === 'username' && (
              <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                {/* Decoy fields: some Chrome versions ignore autoComplete="off" and fill
                    the first username/password pair they see. Give them throwaway ones. */}
                <input type="text" name="fakeusernameremembered" className="hidden" tabIndex={-1} aria-hidden />
                <input type="password" name="fakepasswordremembered" className="hidden" tabIndex={-1} aria-hidden />

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username / Email</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoComplete="off"
                    className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      autoComplete="new-password"
                      className="w-full bg-white border border-gray-300 rounded px-4 py-2 pr-11 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#0b3d91] hover:bg-[#0a3480] disabled:opacity-50 text-white font-semibold py-2 rounded transition"
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
                      <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                      <div className="flex gap-2">
                        <span className="px-4 py-2 bg-gray-100 border border-gray-300 rounded text-gray-500 flex items-center">
                          +91
                        </span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="Enter 10-digit number"
                          maxLength={10}
                          className="flex-1 bg-white border border-gray-300 rounded px-4 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0b3d91]"
                          disabled={isLoading}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">OTP will be sent to this number</p>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || phone.length !== 10}
                      className="w-full bg-[#0b3d91] hover:bg-[#0a3480] disabled:opacity-50 text-white font-semibold py-2 rounded transition"
                    >
                      {isLoading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                      <p className="text-xs text-gray-500 mb-3">
                        OTP sent to +91-{phone.slice(0, 5)}****
                      </p>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 4-6 digit OTP"
                        maxLength={6}
                        className="w-full bg-white border border-gray-300 rounded px-4 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0b3d91] text-center font-mono text-lg tracking-widest"
                        disabled={isLoading}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || otp.length < 4}
                      className="w-full bg-[#0b3d91] hover:bg-[#0a3480] disabled:opacity-50 text-white font-semibold py-2 rounded transition"
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
                      className="w-full text-gray-500 hover:text-gray-800 text-sm font-medium transition"
                    >
                      &larr; Back to Phone Number
                    </button>
                  </form>
                )}
              </>
            )}

            {/* Demo Section - Only for Username Mode */}
            {loginMode === 'username' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowDemo(!showDemo)}
                  className="w-full text-gray-500 hover:text-gray-800 text-sm font-medium transition"
                >
                  {showDemo ? '← Hide Demo Accounts' : 'Demo Accounts'}
                </button>

                {showDemo && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-gray-500">
                      Select an account to fill the form, then press <strong>Login</strong>.
                    </p>
                    {demoAccounts.map((account, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleDemoSelect(account)}
                        className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition"
                      >
                        <div className="text-sm font-medium text-gray-800">{account.role}</div>
                        <div className="text-xs text-gray-500">{account.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{account.username}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-gray-500 text-sm">
            <p>Emergency? Call <strong className="text-gray-700">1930</strong> (24/7 Helpline)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}
