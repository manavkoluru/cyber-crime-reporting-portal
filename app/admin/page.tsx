'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GovHeader, GovFooter } from '@/app/components/GovHeader'

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
  isGoldenHour?: boolean
  goldenHourAutoFrozen?: boolean
  policeNotes?: Array<{ timestamp: Date; officer: string; note: string; isPublic: boolean }>
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
  const [newNote, setNewNote] = useState('')
  const [noteIsPublic, setNoteIsPublic] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

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
        const userRes = await fetch('/api/auth/me', { credentials: 'include' })
        if (!userRes.ok) {
          router.push('/login')
          return
        }
        const userData = await userRes.json()
        setUser(userData)

        const complaintsRes = await fetch('/api/complaints', { credentials: 'include' })
        if (complaintsRes.ok) {
          const data = await complaintsRes.json()
          const parsed = (data.complaints || []).map((c: any) => ({
            ...c,
            timestamp: new Date(c.timestamp),
            timeline: (c.timeline || []).map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) })),
            policeNotes: (c.policeNotes || []).map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) })),
          }))
          setComplaints(parsed)
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

  useEffect(() => {
    if (!user) return

    let filtered = [...complaints]

    if (user.role === 'POLICE') {
      filtered = filtered.filter((c) => c.assignedJurisdiction === user.jurisdiction)
    } else if (user.role === 'ADMIN') {
      if (user.jurisdiction === 'Karnataka') {
        filtered = filtered.filter((c) => c.assignedJurisdiction.includes('Bangalore'))
      } else if (user.jurisdiction === 'Bangalore') {
        filtered = filtered.filter((c) => c.assignedJurisdiction.includes('Bangalore'))
      }
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((c) => c.status === statusFilter)
    }

    setFilteredComplaints(filtered)
  }, [user, complaints, statusFilter])

  const handleAddNote = async () => {
    if (!selectedComplaint || !newNote.trim()) return

    try {
      const res = await fetch('/api/complaints', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: selectedComplaint.id,
          action: 'add-note',
          data: { note: newNote, isPublic: noteIsPublic },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSelectedComplaint(data.complaint)
        setComplaints(complaints.map((c) => (c.id === data.complaint.id ? data.complaint : c)))
        setNewNote('')
        setNoteIsPublic(false)
      }
    } catch (error) {
      console.error('Failed to add note:', error)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedComplaint) return
    setUpdatingStatus(true)

    try {
      const res = await fetch('/api/complaints', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: selectedComplaint.id,
          action: 'update-status',
          data: { status: newStatus, reason: `Status changed by ${user?.username}` },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setSelectedComplaint(data.complaint)
        setComplaints(complaints.map((c) => (c.id === data.complaint.id ? data.complaint : c)))
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusOptions = (complaint: Complaint) => {
    const current = complaint.status
    if (complaint.isGoldenHour) {
      return ['FILED', 'REVIEWED', 'SENT_FOR_FREEZING', 'ACCOUNT_FROZEN', 'RESOLVED']
    }
    return ['FILED', 'REVIEWED', 'PENDING_CLARIFICATION', 'UNDER_INVESTIGATION', 'ACCOUNT_FROZEN', 'RESOLVED']
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <GovHeader
        title={`Cyber Crime Portal – ${user.role === 'POLICE' ? 'Police' : 'Admin'}`}
        rightSlot={
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-800">{user.username}</p>
              <p className="text-xs text-gray-500">
                {user.role === 'POLICE'
                  ? `Assigned: ${user.jurisdiction}`
                  : user.role === 'ADMIN'
                    ? `Jurisdiction: ${user.jurisdiction}`
                    : 'System Administrator'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg text-sm transition"
            >
              Logout
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
            <div className="text-3xl font-bold text-gray-800">{filteredComplaints.length}</div>
            <div className="text-sm text-gray-500">Total Cases</div>
          </div>
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
            <div className="text-3xl font-bold text-orange-600">
              {filteredComplaints.filter((c) => c.isGoldenHour).length}
            </div>
            <div className="text-sm text-gray-500">Golden Hour</div>
          </div>
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
            <div className="text-3xl font-bold text-red-600">
              {filteredComplaints.filter((c) => c.status === 'UNDER_INVESTIGATION').length}
            </div>
            <div className="text-sm text-gray-500">Under Investigation</div>
          </div>
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
            <div className="text-3xl font-bold text-green-600">
              {filteredComplaints.filter((c) => c.status === 'RESOLVED').length}
            </div>
            <div className="text-sm text-gray-500">Resolved</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Complaints List */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Cases</h2>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-gray-300 text-gray-700 rounded px-3 py-1 text-sm"
                >
                  <option value="ALL">All Status</option>
                  <option value="FILED">Filed</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="PENDING_CLARIFICATION">Pending Clarification</option>
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="ACCOUNT_FROZEN">Account Frozen</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              {filteredComplaints.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No cases found</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredComplaints.map((complaint) => (
                    <button
                      key={complaint.id}
                      onClick={() => setSelectedComplaint(complaint)}
                      className={`w-full text-left p-4 rounded-lg border transition ${
                        selectedComplaint?.id === complaint.id
                          ? 'bg-blue-50 border-[#0b3d91]/40'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-gray-800 flex items-center gap-2">
                            {complaint.ccn}
                            {complaint.isGoldenHour && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">⚡ Golden Hour</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">₹{complaint.amount.toLocaleString()}</div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            complaint.status === 'RESOLVED'
                              ? 'bg-green-100 text-green-700'
                              : complaint.status === 'ACCOUNT_FROZEN'
                                ? 'bg-blue-100 text-blue-700'
                                : complaint.status === 'UNDER_INVESTIGATION'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {complaint.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {complaint.assignedJurisdiction} • {new Date(complaint.timestamp).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Complaint Details Panel */}
          <div className="lg:col-span-1">
            {selectedComplaint ? (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 sticky top-24 max-h-96 overflow-y-auto">
                <h3 className="text-lg font-bold text-gray-800 mb-4">{selectedComplaint.ccn}</h3>

                <div className="space-y-3 text-sm mb-6">
                  <div>
                    <div className="text-gray-400">Amount</div>
                    <div className="text-gray-800 font-semibold">₹{selectedComplaint.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Receiver</div>
                    <div className="text-gray-800 font-mono text-xs break-all">{selectedComplaint.receiver}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">UTR</div>
                    <div className="text-gray-800 font-mono text-xs">{selectedComplaint.utr}</div>
                  </div>
                  {selectedComplaint.isGoldenHour && (
                    <div>
                      <div className="text-orange-600 font-semibold">⚡ Golden Hour Active</div>
                      {selectedComplaint.goldenHourAutoFrozen && (
                        <div className="text-xs text-green-600">✅ Auto-frozen</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Update - Police Only */}
                {user.role === 'POLICE' && (
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <label className="text-xs text-gray-500 mb-2 block">Update Status</label>
                    <select
                      value={selectedComplaint.status}
                      onChange={(e) => handleStatusUpdate(e.target.value)}
                      disabled={updatingStatus}
                      className="w-full bg-white border border-gray-300 text-gray-700 rounded px-2 py-1 text-sm"
                    >
                      {getStatusOptions(selectedComplaint).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Comments Section - Real-time discussion */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-gray-800">💬 Discussion</label>
                    {user.role === 'POLICE' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">You can comment</span>
                    )}
                  </div>

                  {/* Comments Thread */}
                  {selectedComplaint.policeNotes && selectedComplaint.policeNotes.length > 0 && (
                    <div className="mb-3 space-y-2 max-h-40 overflow-y-auto bg-gray-50 rounded p-2">
                      {selectedComplaint.policeNotes.map((note, i) => (
                        <div key={i} className={`text-xs p-2 rounded ${note.isPublic ? 'bg-blue-50 border-l-2 border-blue-500' : 'bg-yellow-50 border-l-2 border-yellow-500'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-800">{note.officer}</span>
                            <span className="text-xs text-gray-500">{new Date(note.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-gray-700 mb-1">{note.note}</p>
                          <div className="flex items-center gap-2">
                            {note.isPublic && <span className="text-xs text-green-600">✓ Visible to complainant</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Comment Input - Police Only */}
                  {user.role === 'POLICE' && (
                    <div className="space-y-2">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Type comment (share updates, ask for clarification, etc.)..."
                        className="w-full bg-white border border-gray-300 text-gray-700 rounded px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0b3d91]"
                        rows={2}
                      />
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noteIsPublic}
                          onChange={(e) => setNoteIsPublic(e.target.checked)}
                          className="w-3 h-3 cursor-pointer"
                        />
                        <span className={noteIsPublic ? 'text-green-700 font-medium' : 'text-gray-600'}>
                          {noteIsPublic ? '✓ Complainant will see this' : 'Private note (only police)'}
                        </span>
                      </label>
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim()}
                        className="w-full bg-[#0b3d91] hover:bg-[#0a3480] disabled:opacity-50 text-white font-semibold py-2 rounded text-xs transition"
                      >
                        Post Comment
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 text-center text-gray-500">
                Select a case to view details
              </div>
            )}
          </div>
        </div>
      </div>

      <GovFooter />
    </div>
  )
}
