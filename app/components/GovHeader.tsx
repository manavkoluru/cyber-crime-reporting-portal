'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Facebook, Instagram, Linkedin, Send, Twitter, Youtube } from 'lucide-react'

// Official cyber-safety handles of "CyberDost" (Indian Cybercrime Coordination
// Centre / I4C, Ministry of Home Affairs) as shown on cybercrime.gov.in.
const SOCIAL_LINKS = [
  { label: 'CyberDost on X (Twitter)', href: 'https://x.com/Cyberdost', Icon: Twitter },
  { label: 'CyberDost on Facebook', href: 'https://facebook.com/CyberDostI4C', Icon: Facebook },
  { label: 'CyberDost on Instagram', href: 'https://instagram.com/cyberdosti4c', Icon: Instagram },
  { label: 'CyberDost on YouTube', href: 'https://youtube.com/@cyberdosti4c', Icon: Youtube },
  { label: 'CyberDost on LinkedIn', href: 'https://linkedin.com/company/cyberdosti4c', Icon: Linkedin },
  { label: 'CyberDost on Telegram', href: 'https://t.me/cyberdosti4c', Icon: Send },
] as const

function EmblemFallback() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10 sm:w-12 sm:h-12" aria-label="Emblem of India">
      <circle cx="24" cy="24" r="22" fill="none" stroke="#0b3d91" strokeWidth="1.5" />
      <path d="M24 8c-6 4-10 9-10 16 0 7 4 12 10 16 6-4 10-9 10-16 0-7-4-12-10-16z" fill="#0b3d91" />
      <circle cx="24" cy="24" r="4" fill="#fff" />
    </svg>
  )
}

export function TopStrip() {
  return (
    <div className="w-full bg-[#0b3d91] text-white text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
        <div className="flex items-center gap-2 font-medium tracking-wide">
          <span className="hidden sm:inline">भारत सरकार | GOVERNMENT OF INDIA</span>
          <span className="sm:hidden">GOVERNMENT OF INDIA</span>
          <span className="mx-2 opacity-50 hidden sm:inline">|</span>
          <span className="hidden sm:inline">गृह मंत्रालय | MINISTRY OF HOME AFFAIRS</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="hover:underline underline-offset-2">A- A A+</button>
          <span className="opacity-50">|</span>
          <button className="hover:underline underline-offset-2">हिंदी</button>
        </div>
      </div>
    </div>
  )
}

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Report Fraud', href: '/report-fraud' },
  { label: 'Track your Complaint', href: '/track-complaint' },
  { label: 'Awareness', href: '/awareness' },
]

export function GovHeader({
  title = 'National Cyber Crime Reporting Portal',
  subtitle = 'राष्ट्रीय साइबर अपराध रिपोर्टिंग पोर्टल',
  rightSlot,
}: {
  title?: string
  subtitle?: string
  rightSlot?: React.ReactNode
}) {
  const [imgOk, setImgOk] = useState(false)

  return (
    <>
      <TopStrip />
      <div className="w-full bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            {imgOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/images/emblem-india.png"
                alt="Emblem of India"
                width={48}
                height={48}
                className="w-10 h-10 sm:w-12 sm:h-12 object-contain flex-shrink-0"
                onError={() => setImgOk(false)}
              />
            ) : (
              <EmblemFallback />
            )}
            <div className="min-w-0">
              <p className="text-[#0b3d91] font-bold text-sm sm:text-lg leading-tight truncate">{subtitle}</p>
              <h1 className="text-gray-800 font-bold text-sm sm:text-lg leading-tight truncate">{title}</h1>
            </div>
          </Link>
          {rightSlot}
        </div>
      </div>
      <nav className="w-full bg-[#4a72c4] text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 text-sm font-semibold whitespace-nowrap hover:bg-[#0b3d91] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <div className="w-full h-1.5 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>
    </>
  )
}

export function GovFooter() {
  return (
    <footer className="w-full bg-[#0b3d91] text-white mt-16">
      <div className="w-full h-1.5 flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8 text-sm">
          <div>
            <h4 className="font-semibold text-white mb-3">Quick Links</h4>
            <ul className="space-y-2 text-blue-100">
              <li><Link href="/" className="hover:text-white hover:underline">Home</Link></li>
              <li><Link href="/report-fraud" className="hover:text-white hover:underline">Report Fraud</Link></li>
              <li><Link href="/track-complaint" className="hover:text-white hover:underline">Track Complaint</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Resources</h4>
            <ul className="space-y-2 text-blue-100">
              <li><Link href="/awareness" className="hover:text-white hover:underline">Cyber Awareness</Link></li>
              <li><a href="#" className="hover:text-white hover:underline">FAQ</a></li>
              <li><a href="#" className="hover:text-white hover:underline">User Guide</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Support</h4>
            <ul className="space-y-2 text-blue-100">
              <li><a href="tel:1930" className="hover:text-white hover:underline">National Helpline: 1930 (24x7)</a></li>
              <li><a href="#" className="hover:text-white hover:underline">Contact Us</a></li>
              <li><a href="#" className="hover:text-white hover:underline">Privacy Policy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">An Initiative of</h4>
            <ul className="space-y-2 text-blue-100">
              <li>Ministry of Home Affairs</li>
              <li>Government of India</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20 pt-6 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h4 className="font-semibold text-white text-sm">Connect with CyberDost</h4>
            <p className="text-blue-100 text-xs mt-1">
              Official cyber-safety handles of I4C, Ministry of Home Affairs
            </p>
          </div>
          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <Icon size={18} strokeWidth={1.75} />
              </a>
            ))}
          </div>
        </div>
        <div className="border-t border-white/20 pt-6 text-center text-blue-100 text-xs">
          <p>&copy; 2026 National Cyber Crime Reporting Portal. All rights reserved.</p>
          <p className="mt-1">Content owned and maintained by Ministry of Home Affairs, Government of India</p>
        </div>
      </div>
    </footer>
  )
}
