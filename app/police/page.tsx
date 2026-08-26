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
}

interface User {
  userId: string
  username: string
  role: string
  jurisdiction?: string
}

export default function PoliceViewPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [newComment, setNewComment] = useState('')
  const [commentIsPublic, setCommentIsPublic] = useState(true)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  const handleAddComment = async () => {
    if (!selectedComplaint || !newComment.trim()) return
    
    setIsSubmittingComment(true)
    try {
      const res = await fetch('/api/complaints', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: selectedComplaint.id,
          action: 'add-note',
          data: { note: newComment, isPublic: commentIsPublic },
        }),
      })

      if (res.ok) {
        setNewComment('')
        setCommentIsPublic(true)
        // Refresh the complaint
        const refreshRes = await fetch('/api/complaints', { credentials: 'include' })
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          const updated = data.complaints.find((c: any) => c.id === selectedComplaint.id)
          if (updated) {
            setSelectedComplaint({ ...updated, timestamp: new Date(updated.timestamp) })
          }
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsSubmittingComment(false)
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
        const userRes = await fetch('/api/auth/me', { credentials: 'include' })
        if (!userRes.ok) {
          router.push('/login')
          return
        }
        const userData = await userRes.json()
        if (userData.role !== 'POLICE') {
          router.push('/admin')
          return
        }
        setUser(userData)

        const complaintsRes = await fetch('/api/complaints', { credentials: 'include' })
        if (complaintsRes.ok) {
          const data = await complaintsRes.json()
          const parsed = (data.complaints || []).map((c: any) => ({
            ...c,
            timestamp: new Date(c.timestamp),
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
        title="Cyber Crime Portal – Review Queue"
        rightSlot={
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-800">{user.username}</p>
              <p className="text-xs text-gray-500">{user.jurisdiction || 'Assigned'}</p>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
            <div className="text-3xl font-bold text-gray-800">{complaints.length}</div>
            <div className="text-sm text-gray-500">Pending Review</div>
          </div>
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-600">
              {complaints.filter((c) => c.status === 'FILED').length}
            </div>
            <div className="text-sm text-gray-500">Filed (New)</div>
          </div>
          <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
            <div className="text-3xl font-bold text-orange-600">
              ₹{complaints.reduce((sum, c) => sum + c.amount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Total Amount at Risk</div>
          </div>
        </div>

        {/* Minimal List View */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Complaints for Review</h2>

          {complaints.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No complaints to review</p>
            </div>
          ) : (
            <div className="space-y-2">
              {complaints.map((complaint) => (
                <button
                  key={complaint.id}
                  onClick={() => setSelectedComplaint(complaint)}
                  className={`w-full text-left p-4 rounded-lg border transition ${
                    selectedComplaint?.id === complaint.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{complaint.ccn}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {complaint.fraudNarrative.substring(0, 60)}...
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-800">₹{complaint.amount.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{complaint.paymentPlatform}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">{complaint.status}</span>
                    <span className="text-gray-500">Confidence: {(complaint.confidenceScore * 100).toFixed(0)}%</span>
                    <span className="text-gray-500">{complaint.assignedJurisdiction}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail View - Read Only */}
        {selectedComplaint && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-200 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto shadow-xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-800">{selectedComplaint.ccn}</h3>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="text-gray-400 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Amount</p>
                    <p className="text-2xl font-bold text-gray-800">₹{selectedComplaint.amount.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-400 text-xs mb-1">Status</p>
                    <p className="text-lg font-semibold text-gray-800">{selectedComplaint.status}</p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Transaction Details</p>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div><strong>UTR:</strong> {selectedComplaint.utr}</div>
                    <div><strong>Platform:</strong> {selectedComplaint.paymentPlatform}</div>
                    <div><strong>Receiver:</strong> {selectedComplaint.receiver}</div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-400 text-xs mb-1">Complaint Narrative</p>
                  <p className="text-sm text-gray-700">{selectedComplaint.fraudNarrative}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-900 text-sm font-semibold">
                    Confidence Score: {(selectedComplaint.confidenceScore * 100).toFixed(0)}%
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    Location: {selectedComplaint.complainantLocation}
                  </p>
                </div>

                {/* Quick Comment Section */}
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-sm font-semibold text-gray-800 mb-3 block">💬 Add Comment</label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type a comment for this complaint..."
                    className="w-full bg-white border border-gray-300 text-gray-700 rounded px-2 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#0b3d91] mb-2"
                    rows={2}
                  />
                  <label className="flex items-center gap-2 text-xs mb-3">
                    <input
                      type="checkbox"
                      checked={commentIsPublic}
                      onChange={(e) => setCommentIsPublic(e.target.checked)}
                      className="w-3 h-3"
                    />
                    <span className={commentIsPublic ? 'text-green-700 font-medium' : 'text-gray-600'}>
                      {commentIsPublic ? '✓ Complainant will see' : 'Private note (police only)'}
                    </span>
                  </label>
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="w-full bg-[#0b3d91] hover:bg-[#0a3480] disabled:opacity-50 text-white font-semibold py-2 rounded text-xs transition mb-3"
                  >
                    {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded transition"
                  >
                    Close
                  </button>
                  <Link
                    href="/admin"
                    className="flex-1 py-2 bg-[#0b3d91] hover:bg-[#0a3480] text-white font-semibold rounded transition text-center"
                  >
                    Full Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <GovFooter />
    </div>
  )
}
