'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)

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
        setIsLoading(false)
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const features = [
    { icon: '🚨', title: 'Report Fraud', desc: 'File cyber fraud complaint instantly', color: 'from-red-600 to-red-700', href: '/chat' },
    { icon: '☑️', title: 'Track Complaint', desc: 'Monitor your complaint status', color: 'from-blue-600 to-blue-700', href: '/track-complaint' },
    { icon: '🛒', title: 'Consumer Disputes', desc: 'E-commerce & marketplace issues', color: 'from-green-600 to-green-700', href: '/chat' },
    { icon: '📚', title: 'Awareness', desc: 'Learn about cyber threats', color: 'from-purple-600 to-purple-700', href: '/awareness' },
  ]

  const stats = [
    { label: 'Complaints Processed', value: '2.5M+', icon: '📋' },
    { label: 'Amount Recovered', value: '₹850Cr+', icon: '💰' },
    { label: 'Active Cases', value: '45K+', icon: '⚖️' },
    { label: 'Response Time', value: '< 24hrs', icon: '⚡' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-950/50 border-b border-slate-700/50 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-600 to-red-700 p-2 rounded-lg">
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">National Cyber Crime Portal</h1>
              <p className="text-xs text-slate-400">Powered by AI</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a href="tel:1930" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold">
              📞 1930 Helpline
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

      {/* Hero Stats */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-slate-900/50 backdrop-blur border border-slate-700/50 rounded-lg p-4 text-center hover:bg-slate-800/50 transition">
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* AI-Powered Crime Reporting Featured Section */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
              {/* Left: Introduction */}
              <div className="flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded-full px-4 py-2 w-fit mb-4">
                  <span className="text-sm text-red-300">✨ New Feature</span>
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">AI-Powered Response</h2>
                <p className="text-slate-300 text-lg mb-6 leading-relaxed">
                  Your <span className="text-red-400 font-semibold">AI-powered cyber fraud response assistant</span>. Get instant assistance with fraud reporting, complaint filing, and real-time guidance.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-slate-300">
                    <span className="text-green-400">✓</span> Upload UPI/bank screenshots for instant analysis
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <span className="text-green-400">✓</span> Get Golden Hour alerts for time-sensitive cases
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <span className="text-green-400">✓</span> File complaints in 3 steps with auto-generated CCN
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <span className="text-green-400">✓</span> Voice input in Hindi/English
                  </li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/chat"
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-lg transition shadow-lg"
                  >
                    🚀 File a Complaint
                  </Link>
                  <Link
                    href="/awareness"
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
                  >
                    📚 Learn More
                  </Link>
                </div>
              </div>

              {/* Right: Chat Preview */}
              <div className="bg-slate-950 border border-slate-700/50 rounded-xl p-6 flex flex-col max-h-96 overflow-hidden shadow-inner">
                <div className="text-white text-sm font-semibold mb-4">Quick Example:</div>
                <div className="flex-1 overflow-y-auto space-y-3 text-sm mb-4">
                  <div className="flex justify-start">
                    <div className="bg-slate-800 text-slate-200 px-4 py-2 rounded-lg rounded-bl-none max-w-xs">
                      I lost ₹8400 on PhonePe to a scammer
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-red-600/20 text-red-200 px-4 py-2 rounded-lg rounded-br-none max-w-xs border border-red-500/30">
                      ⚡ GOLDEN HOUR ACTIVE - Funds may be recoverable!
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-red-600/20 text-red-200 px-4 py-2 rounded-lg rounded-br-none max-w-xs border border-red-500/30 text-xs">
                      ✅ CCN-2026-847392 filed. Next: Call 1930 with this number.
                    </div>
                  </div>
                </div>
                <Link
                  href="/chat"
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition block text-center"
                >
                  Start Chat 🎤
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-white mb-8">Other Portal Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <Link
                key={i}
                href={feature.href}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/80 hover:bg-slate-750/50 transition group cursor-pointer block"
              >
                <div className={`text-4xl mb-4 group-hover:scale-110 transition`}>{feature.icon}</div>
                <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
                <p className="text-slate-400 text-sm mb-4">{feature.desc}</p>
                <span className="text-red-400 group-hover:text-red-300 text-sm font-semibold">
                  Explore →
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-white mb-8">What Users Say</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Priya S.', city: 'Mumbai', text: 'The portal helped me file a complaint in 5 minutes. Got my money back in 2 weeks!' },
              { name: 'Rajesh K.', city: 'Delhi', text: 'The voice input feature is amazing. Explained everything in Hindi, very easy to use.' },
              { name: 'Anjali M.', city: 'Bangalore', text: 'Best platform for cyber fraud reporting. Fast, transparent, and very helpful.' },
            ].map((testimonial, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                <div className="flex gap-1 mb-3">{'⭐'.repeat(5)}</div>
                <p className="text-slate-300 mb-4">"{testimonial.text}"</p>
                <p className="font-semibold text-white">{testimonial.name}</p>
                <p className="text-sm text-slate-500">{testimonial.city}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-red-600/20 to-red-700/20 border border-red-600/50 rounded-2xl p-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">Need Help Right Now?</h3>
          <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
            Don't know where to start? Let our AI assistant guide you through the entire process with intelligent, real-time assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chat"
              className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
            >
              Start Filing a Complaint
            </Link>
            <a href="tel:1930" className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition">
              Call 1930 Helpline
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-700/50 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">Home</a></li>
                <li><a href="#" className="hover:text-white">Report Fraud</a></li>
                <li><a href="#" className="hover:text-white">Track Complaint</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Awareness</a></li>
                <li><a href="#" className="hover:text-white">Guide</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="tel:1930" className="hover:text-white">📞 1930 (24x7)</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Certifications</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>🔒 ISO 27001</li>
                <li>✓ Government Verified</li>
                <li>🏆 Trusted Platform</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700/50 pt-8 text-center text-slate-500 text-sm">
            <p>&copy; 2026 National Cyber Crime Reporting Portal. All rights reserved.</p>
            <p className="mt-2">Ministry of Interior | Government of India</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
