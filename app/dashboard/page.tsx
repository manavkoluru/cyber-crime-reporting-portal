'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import ProfileMenu from '@/app/components/ProfileMenu'
import { GovHeader, GovFooter } from '@/app/components/GovHeader'

export default function Dashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
        if (!res.ok) {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const features = [
    { title: 'Report Fraud', desc: 'File cyber fraud complaint instantly', href: '/chat' },
    { title: 'Track Complaint', desc: 'Monitor your complaint status', href: '/track-complaint' },
    { title: 'Consumer Disputes', desc: 'E-commerce & marketplace issues', href: '/chat' },
    { title: 'Awareness', desc: 'Learn about cyber threats', href: '/awareness' },
  ]

  const stats = [
    { label: 'Complaints Processed', value: '2.5M+' },
    { label: 'Amount Recovered', value: '₹850Cr+' },
    { label: 'Active Cases', value: '45K+' },
    { label: 'Response Time', value: '< 24hrs' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader
        rightSlot={
          <div className="flex items-center gap-3 flex-shrink-0">
            <a href="tel:1930" className="px-4 py-2 bg-[#FF9933] hover:bg-[#e6862b] text-white rounded text-sm font-semibold">
              1930 Helpline
            </a>
            <ProfileMenu />
          </div>
        }
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Instant Crime Reporting Featured Section */}
        <div className="mb-16">
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
              {/* Left: Introduction */}
              <div className="flex flex-col justify-center">
                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 w-fit mb-4">
                  <span className="text-sm text-[#0b3d91] font-semibold">New Feature</span>
                </div>
                <h2 className="text-4xl font-bold text-gray-800 mb-4">Instant Fraud Response</h2>
                <p className="text-gray-600 text-lg mb-6 leading-relaxed">
                  File your complaint in <span className="text-[#0b3d91] font-semibold">under 2 minutes</span>. We guide you step-by-step, right when it matters most.
                </p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-gray-700">
                    <span className="text-[#138808] font-bold">✓</span> Upload UPI/bank screenshots for instant analysis
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <span className="text-[#138808] font-bold">✓</span> Get Golden Hour alerts for time-sensitive cases
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <span className="text-[#138808] font-bold">✓</span> File complaints in 3 steps with auto-generated CCN
                  </li>
                  <li className="flex items-center gap-3 text-gray-700">
                    <span className="text-[#138808] font-bold">✓</span> Voice input in Hindi/English
                  </li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/chat"
                    className="px-6 py-3 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded transition shadow-lg"
                  >
                    File a Complaint
                  </Link>
                  <Link
                    href="/awareness"
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-semibold rounded transition"
                  >
                    Learn More
                  </Link>
                </div>
              </div>

              {/* Right: Chat Preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex flex-col max-h-96 overflow-hidden">
                <div className="text-gray-800 text-sm font-semibold mb-4">Quick Example:</div>
                <div className="flex-1 overflow-y-auto space-y-3 text-sm mb-4">
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg rounded-bl-none max-w-xs">
                      I lost ₹8400 on PhonePe to a scammer
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-orange-50 text-orange-800 px-4 py-2 rounded-lg rounded-br-none max-w-xs border border-orange-200">
                      GOLDEN HOUR ACTIVE - Funds may be recoverable!
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-green-50 text-green-800 px-4 py-2 rounded-lg rounded-br-none max-w-xs border border-green-200 text-xs">
                      CCN-2026-847392 filed. Next: Call 1930 with this number.
                    </div>
                  </div>
                </div>
                <Link
                  href="/chat"
                  className="w-full py-2 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded transition block text-center"
                >
                  Start Chat
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-8">Other Portal Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <Link
                key={i}
                href={feature.href}
                className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 hover:shadow-md transition group cursor-pointer block border-t-4 border-t-[#0b3d91]"
              >
                <h4 className="text-lg font-semibold text-gray-800 mb-2">{feature.title}</h4>
                <p className="text-gray-600 text-sm mb-4">{feature.desc}</p>
                <span className="text-[#0b3d91] group-hover:underline text-sm font-semibold">
                  Explore &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Hero Stats */}
        <div className="mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-[#0b3d91]">{stat.value}</div>
                <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-800 mb-8">What Users Say</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Priya S.', city: 'Mumbai', text: 'The portal helped me file a complaint in under 2 minutes. Got my money back in 2 weeks!' },
              { name: 'Rajesh K.', city: 'Delhi', text: 'The voice input feature is amazing. Explained everything in Hindi, very easy to use.' },
              { name: 'Anjali M.', city: 'Bangalore', text: 'Best platform for cyber fraud reporting. Fast, transparent, and very helpful.' },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                <p className="text-gray-600 mb-4">&quot;{testimonial.text}&quot;</p>
                <p className="font-semibold text-gray-800">{testimonial.name}</p>
                <p className="text-sm text-gray-500">{testimonial.city}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-[#fff4e5] border border-[#FF9933]/40 rounded-lg p-8 text-center">
          <h3 className="text-3xl font-bold text-gray-800 mb-4">Need Help Right Now?</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Don&apos;t know where to start? We&apos;ll guide you through the entire process — fast, step by step, no jargon.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chat"
              className="px-8 py-3 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded transition"
            >
              Start Filing a Complaint
            </Link>
            <a href="tel:1930" className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 font-semibold rounded transition">
              Call 1930 Helpline
            </a>
          </div>
        </div>
      </div>

      <GovFooter />
    </div>
  )
}
