'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Complaint {
  id: string
  ccn: string
  complainantPhone: string
  complainantLocation: string
  fraudNarrative: string
  amount: number
  receiver: string
  utr: string
  paymentPlatform: string
  timestamp: Date
  status: string
  confidenceScore: number
  assignedJurisdiction: string
  frozenAccounts: string[]
  timeline: Array<{ timestamp: Date; action: string; actor: string; details?: string }>
  escalatedToAdmin: boolean
}

interface User {
  userId: string
  username: string
  role: string
  jurisdiction?: string
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

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

  useEffect(() => {
    const initPage = async () => {
      try {
        // Get current user
        const userRes = await fetch('/api/auth/me', { credentials: 'include' })
        if (!userRes.ok) {
          router.push('/login')
          return
        }
        const userData = await userRes.json()
        setUser(userData)

        // Get complaints from backend
        const complaintsRes = await fetch('/api/complaints', { credentials: 'include' })
        if (complaintsRes.ok) {
          const data = await complaintsRes.json()
          setComplaints(data.complaints || [])
        }
      } catch (err) {
        console.error('Failed to load page:', err)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    initPage()
  }, [router])

  // Filter complaints based on role and jurisdiction
  useEffect(() => {
    if (!user) return

    let filtered = [...complaints]

    // Filter by role/jurisdiction
    if (user.role === 'POLICE') {
      // Police see only complaints assigned to their jurisdiction
      filtered = filtered.filter((c) => c.assignedJurisdiction === user.jurisdiction)
    } else if (user.role === 'ADMIN') {
      // Admin sees complaints in their jurisdiction or state
      if (user.jurisdiction === 'Karnataka') {
        // State admin sees all Karnataka complaints
        filtered = filtered.filter((c) => c.assignedJurisdiction.includes('Bangalore'))
      } else if (user.jurisdiction === 'Bangalore') {
        // City admin sees all Bangalore complaints
        filtered = filtered.filter((c) => c.assignedJurisdiction.includes('Bangalore'))
      }
    }

    // Filter by status
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((c) => c.status === statusFilter)
    }

    setFilteredComplaints(filtered)
  }, [user, complaints, statusFilter])

  const handleStatusUpdate = (complaintId: string, newStatus: string) => {
    setComplaints(
      complaints.map((c) => (c.id === complaintId ? { ...c, status: newStatus } : c))
    )
    setSelectedComplaint(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <nav className="bg-slate-950/80 border-b border-slate-700/50 sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
              title="Go back"
            >
              ← Back
            </button>
            <div className="bg-red-600 p-2 rounded-lg">
              <span className="text-2xl">🛡️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Cyber Crime Portal – Admin</h1>
              <p className="text-xs text-slate-400">
                {user.role === 'POLICE'
                  ? `Assigned: ${user.jurisdiction}`
                  : user.role === 'ADMIN'
                    ? `Jurisdiction: ${user.jurisdiction}`
                    : 'System Administrator'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user.username}</p>
              <p className="text-xs text-slate-400">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-white">{filteredComplaints.length}</div>
            <div className="text-sm text-slate-400">Total Complaints</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">
              {filteredComplaints.filter((c) => c.status === 'UNDER_INVESTIGATION').length}
            </div>
            <div className="text-sm text-slate-400">Under Investigation</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">
              {filteredComplaints.filter((c) => c.status === 'PENDING_CLARIFICATION').length}
            </div>
            <div className="text-sm text-slate-400">Pending Info</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">
              {filteredComplaints.filter((c) => c.status === 'RESOLVED').length}
            </div>
            <div className="text-sm text-slate-400">Resolved</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Complaints List */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Complaints</h2>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-1 text-sm"
                >
                  <option value="ALL">All Status</option>
                  <option value="FILED">Filed</option>
                  <option value="PENDING_CLARIFICATION">Pending Clarification</option>
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="ACCOUNT_FROZEN">Account Frozen</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              {filteredComplaints.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No complaints found</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredComplaints.map((complaint) => (
                    <button
                      key={complaint.id}
                      onClick={() => setSelectedComplaint(complaint)}
                      className={`w-full text-left p-4 rounded-lg border transition ${
                        selectedComplaint?.id === complaint.id
                          ? 'bg-red-600/20 border-red-600/50'
                          : 'bg-slate-700/30 border-slate-600/30 hover:border-slate-600/60'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-white">{complaint.ccn}</div>
                          <div className="text-xs text-slate-400">₹{complaint.amount.toLocaleString()}</div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            complaint.status === 'RESOLVED'
                              ? 'bg-green-600/30 text-green-200'
                              : complaint.status === 'ACCOUNT_FROZEN'
                                ? 'bg-blue-600/30 text-blue-200'
                                : complaint.status === 'UNDER_INVESTIGATION'
                                  ? 'bg-yellow-600/30 text-yellow-200'
                                  : 'bg-slate-600/30 text-slate-200'
                          }`}
                        >
                          {complaint.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {complaint.assignedJurisdiction} • {new Date(complaint.timestamp).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Complaint Details */}
          <div className="lg:col-span-1">
            {selectedComplaint ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 sticky top-24">
                <h3 className="text-lg font-bold text-white mb-4">{selectedComplaint.ccn}</h3>

                <div className="space-y-3 text-sm mb-6">
                  <div>
                    <div className="text-slate-400">Amount</div>
                    <div className="text-white font-semibold">₹{selectedComplaint.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Receiver</div>
                    <div className="text-white font-mono text-xs">{selectedComplaint.receiver}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">UTR</div>
                    <div className="text-white font-mono text-xs">{selectedComplaint.utr}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Location</div>
                    <div className="text-white">{selectedComplaint.complainantLocation}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Jurisdiction</div>
                    <div className="text-white">{selectedComplaint.assignedJurisdiction}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Confidence</div>
                    <div className="text-white">{(selectedComplaint.confidenceScore * 100).toFixed(0)}%</div>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4 mb-4">
                  <div className="text-slate-400 text-xs mb-2">Narrative</div>
                  <div className="text-sm text-slate-200 italic">{selectedComplaint.fraudNarrative}</div>
                </div>

                {/* Status Update (for Police/Admin) */}
                {(user.role === 'POLICE' || user.role === 'ADMIN') && (
                  <div className="space-y-2">
                    <select
                      defaultValue={selectedComplaint.status}
                      onChange={(e) => handleStatusUpdate(selectedComplaint.id, e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
                    >
                      <option value="FILED">Filed</option>
                      <option value="PENDING_CLARIFICATION">Pending Clarification</option>
                      <option value="UNDER_INVESTIGATION">Under Investigation</option>
                      <option value="ACCOUNT_FROZEN">Account Frozen</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center text-slate-400">
                Select a complaint to view details
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pb-4 text-center text-slate-500 text-xs">
        <Link href="/chat" className="hover:text-slate-400 transition">
          ← Back to Chat
        </Link>
      </div>
    </div>
  )
}
