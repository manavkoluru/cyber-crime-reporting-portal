'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ProfileMenu from '@/app/components/ProfileMenu'
import { GovHeader, GovFooter } from '@/app/components/GovHeader'

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
  timeline: Array<{
    timestamp: Date
    action: string
    actor: string
    details?: string
    state?: 'COMPLETED' | 'CURRENT' | 'PENDING'
  }>
  policeNotes?: Array<{
    timestamp: Date
    officer: string
    note: string
    isPublic: boolean
  }>
}

export default function TrackComplaint() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [verifiedPhone, setVerifiedPhone] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [complaints, setComplaints] = useState<Complaint[]>([])

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { method: 'GET', credentials: 'include' })
        if (!meRes.ok) {
          router.push('/login')
          return
        }

        const session = await meRes.json()
        setVerifiedPhone(session.phone || '')

        // Fetch this user's complaint history from the server (in-memory store
        // lives server-side, so it must be read through the API, not imported).
        const res = await fetch('/api/complaints', { method: 'GET', credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const userComplaints = (data.complaints || []).map((c: Complaint) => ({
            ...c,
            timestamp: new Date(c.timestamp),
            timeline: (c.timeline || []).map((event) => ({ ...event, timestamp: new Date(event.timestamp) })),
          })) as Complaint[]
          setComplaints(userComplaints)
        }

        setIsAuthenticated(true)
      } catch (error) {
        console.error('Session check failed:', error)
        router.push('/login')
      }
    }

    loadComplaints()
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FILED':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'INVESTIGATING':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'RESOLVED':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getTimelineStyle = (state: 'COMPLETED' | 'CURRENT' | 'PENDING' = 'PENDING') => {
    if (state === 'COMPLETED') return 'bg-[#138808] text-[#138808]'
    if (state === 'CURRENT') return 'bg-[#0b3d91] text-[#0b3d91]'
    return 'bg-gray-300 text-gray-400'
  }

  const getWorkflowTimeline = (complaint: Complaint) => {
    if (complaint.timeline.length > 1) return complaint.timeline

    return [
      ...(complaint.timeline.length > 0
        ? complaint.timeline
        : [{ timestamp: complaint.timestamp, action: 'Complaint filed', actor: 'COMPLAINANT', details: 'Your report was submitted to the portal.', state: 'COMPLETED' as const }]),
      { timestamp: complaint.timestamp, action: 'Portal review queue', actor: 'SYSTEM', details: 'A reviewer will assess the available evidence and incident summary.', state: 'CURRENT' as const },
      { timestamp: complaint.timestamp, action: 'Receiver-bank action', actor: 'EXTERNAL', details: 'Pending a verified instruction and confirmation from the relevant bank.', state: 'PENDING' as const },
      { timestamp: complaint.timestamp, action: 'Recovery outcome', actor: 'EXTERNAL', details: 'Pending bank and investigation updates.', state: 'PENDING' as const },
    ]
  }

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
        title="Track your Complaint"
        rightSlot={
          <div className="flex items-center gap-3 flex-shrink-0">
            <a href="tel:1930" className="px-4 py-2 bg-[#FF9933] hover:bg-[#e6862b] text-white rounded text-sm font-semibold">
              1930
            </a>
            <ProfileMenu />
          </div>
        }
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-8 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Your Complaints</h2>
            <p className="text-gray-500">Phone: +91-{verifiedPhone.slice(0, 5)}{verifiedPhone.slice(5).replace(/./g, '*')}</p>
          </div>
        </div>

        {/* Complaints List */}
        {complaints.length === 0 ? (
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Complaints Found</h3>
            <p className="text-gray-500 mb-6">You haven&apos;t filed any complaints yet.</p>
            <Link
              href="/chat"
              className="inline-block px-6 py-3 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded transition"
            >
              File New Complaint
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {complaints.length} Complaint{complaints.length !== 1 ? 's' : ''} Found
              </h3>
            </div>

            {complaints.map((complaint) => (
              <div
                key={complaint.id}
                onClick={() => setSelectedComplaint(complaint)}
                className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 hover:shadow-md transition cursor-pointer group border-l-4 border-l-[#0b3d91]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <code className="bg-gray-100 text-[#0b3d91] px-3 py-1 rounded text-sm font-mono">
                        {complaint.ccn}
                      </code>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(complaint.status)}`}>
                        {complaint.status}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm">
                      Filed: {new Date(complaint.timestamp).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-800">₹{complaint.amount.toLocaleString()}</div>
                    <p className="text-gray-500 text-xs">{complaint.paymentPlatform}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Transaction ID</p>
                    <p className="text-gray-800 font-mono">{complaint.utr}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Receiver</p>
                    <p className="text-gray-800 truncate">{complaint.receiver}</p>
                  </div>
                </div>

                <button className="w-full mt-4 py-2 bg-gray-100 group-hover:bg-gray-200 text-gray-700 font-semibold rounded transition">
                  View Details &rarr;
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Selected Complaint Details */}
        {selectedComplaint && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-gray-200 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto shadow-xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800">Complaint Details</h3>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="text-gray-400 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-500 text-sm mb-2">Cyber Crime Number</p>
                  <code className="text-[#0b3d91] text-xl font-mono font-bold">{selectedComplaint.ccn}</code>
                  <div className="mt-4">
                    <p className="text-gray-500 text-sm mb-2">Current Status</p>
                    <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(selectedComplaint.status)}`}>
                      {selectedComplaint.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-2">Amount</p>
                    <p className="text-2xl font-bold text-gray-800">₹{selectedComplaint.amount.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-2">Platform</p>
                    <p className="text-lg font-semibold text-gray-800">{selectedComplaint.paymentPlatform}</p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-2">Transaction ID / UTR</p>
                  <code className="text-gray-800 font-mono break-all">{selectedComplaint.utr}</code>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-2">Receiver VPA / Account</p>
                  <p className="text-gray-800">{selectedComplaint.receiver}</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-500 text-sm mb-1">Case progress</p>
                  <p className="text-gray-400 text-xs mb-4">Portal workflow updates. Bank and police actions remain pending until externally confirmed.</p>
                  <ol className="space-y-4">
                    {getWorkflowTimeline(selectedComplaint).map((event, index, timeline) => {
                      const state = event.state || (index === 0 ? 'COMPLETED' : 'PENDING')
                      return (
                        <li key={`${event.action}-${index}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className={`mt-1 h-3 w-3 rounded-full ${getTimelineStyle(state)}`} />
                            {index < timeline.length - 1 && <span className="mt-1 h-full w-px bg-gray-200" />}
                          </div>
                          <div className="pb-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-gray-800">{event.action}</p>
                              <span className={`text-xs font-semibold ${getTimelineStyle(state).split(' ')[1]}`}>{state === 'CURRENT' ? 'IN PROGRESS' : state}</span>
                            </div>
                            {event.details && <p className="mt-1 text-sm text-gray-600">{event.details}</p>}
                            {state !== 'PENDING' && <p className="mt-1 text-xs text-gray-400">{new Date(event.timestamp).toLocaleString('en-IN')}</p>}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </div>

                {/* Police Comments Section */}
                {selectedComplaint.policeNotes && selectedComplaint.policeNotes.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900 mb-3">💬 Police Updates</p>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {selectedComplaint.policeNotes
                        .filter((note) => note.isPublic)
                        .map((note, i) => (
                          <div key={i} className="bg-white rounded p-3 border-l-4 border-blue-500">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-800 text-sm">{note.officer}</span>
                              <span className="text-xs text-gray-500">{new Date(note.timestamp).toLocaleString('en-IN')}</span>
                            </div>
                            <p className="text-sm text-gray-700">{note.note}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded transition"
                  >
                    Close
                  </button>
                  <a
                    href="tel:1930"
                    className="flex-1 py-2 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded transition text-center"
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
          <div className="mt-12 bg-[#fff4e5] border border-[#FF9933]/40 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold text-gray-800 mb-3">Need More Help?</h3>
            <p className="text-gray-600 mb-6">Our support team is available 24/7 to assist you.</p>
            <a href="tel:1930" className="inline-block px-6 py-3 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded transition">
              Call 1930 Helpline
            </a>
          </div>
        )}
      </div>

      <GovFooter />
    </div>
  )
}
