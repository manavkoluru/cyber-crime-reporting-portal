import { NextRequest, NextResponse } from 'next/server'
import {
  getSession,
  getAllComplaints,
  getComplaintsByJurisdiction,
  getComplaintsForComplainant,
  getUserById,
  getComplaint,
  updateComplaint,
  storeReady,
} from '@/lib/store'

export async function GET(req: NextRequest) {
  try {
    await storeReady // ensure persisted complaints are loaded (Redis on a cold start)
    // — Complainant via OTP login: `session` cookie carries userId + verified phone.
    const jsonSession = req.cookies.get('session')?.value
    if (jsonSession) {
      try {
        const s = JSON.parse(jsonSession)
        if (s?.userId || s?.phone) {
          const complaints = getComplaintsForComplainant(
            s.userId ? String(s.userId) : undefined,
            [s.phone]
          )
          return NextResponse.json({
            success: true,
            complaints,
            userRole: s.role || 'COMPLAINANT',
          })
        }
      } catch {
        // Fall through to staff session handling below
      }
    }

    // — Staff / complainant via username+password: `auth_session` id cookie.
    const sessionId = req.cookies.get('auth_session')?.value
    if (sessionId) {
      const session = getSession(sessionId)
      if (session) {
        let complaints: any[] = []
        if (session.role === 'POLICE') {
          complaints = getComplaintsByJurisdiction(session.jurisdiction || '')
        } else if (session.role === 'ADMIN') {
          complaints = getAllComplaints()
        } else {
          // COMPLAINANT logged in with a password: match by user id, and by the
          // phone on their user record as a fallback.
          const user = getUserById(session.userId)
          complaints = getComplaintsForComplainant(session.userId, [user?.phone])
        }
        return NextResponse.json({
          success: true,
          complaints,
          userRole: session.role,
          userJurisdiction: session.jurisdiction,
        })
      }
    }

    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  } catch (error) {
    console.error('[Complaints] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch complaints' },
      { status: 500 }
    )
  }
}

// POST: Update complaint status
export async function POST(req: NextRequest) {
  try {
    await storeReady
    const sessionId = req.cookies.get('auth_session')?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const session = getSession(sessionId)
    if (!session || !['POLICE', 'ADMIN'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { complaintId, newStatus, notes } = body

    // Update would happen here (in production with a DB)
    return NextResponse.json({
      success: true,
      message: 'Status updated',
    })
  } catch (error) {
    console.error('[Complaints] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to update complaint' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionId = req.cookies.get('auth_session')?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const session = getSession(sessionId)
    if (!session || !['POLICE', 'ADMIN'].includes(session.role)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { complaintId, action, data } = body

    if (action === 'add-note') {
      // Add police note
      const complaint = getComplaint(complaintId)
      if (!complaint) {
        return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
      }

      const newNote = {
        timestamp: new Date(),
        officer: session.username,
        note: data.note,
        isPublic: data.isPublic || false,
      }

      if (!complaint.policeNotes) complaint.policeNotes = []
      complaint.policeNotes.push(newNote)
      
      updateComplaint(complaintId, { policeNotes: complaint.policeNotes })

      return NextResponse.json({
        success: true,
        message: 'Note added successfully',
        complaint,
      })
    }

    if (action === 'update-status') {
      // Update complaint status
      const complaint = getComplaint(complaintId)
      if (!complaint) {
        return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
      }

      const oldStatus = complaint.status
      const newStatus = data.status

      const timelineEvent = {
        timestamp: new Date(),
        action: `Status changed: ${oldStatus} → ${newStatus}`,
        actor: session.userId,
        details: data.reason || 'Status updated by ' + session.username,
        state: 'COMPLETED' as const,
      }

      complaint.timeline.push(timelineEvent)
      updateComplaint(complaintId, { status: newStatus, timeline: complaint.timeline })

      return NextResponse.json({
        success: true,
        message: 'Status updated successfully',
        complaint,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Complaints] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update complaint' },
      { status: 500 }
    )
  }
}
