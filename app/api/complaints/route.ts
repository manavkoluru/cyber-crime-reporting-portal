import { NextRequest, NextResponse } from 'next/server'
import {
  getSession,
  getAllComplaints,
  getComplaintsByJurisdiction,
  getComplaintsByPhone,
} from '@/lib/store'

export async function GET(req: NextRequest) {
  try {
    // Complainants log in via OTP, which stores a JSON "session" cookie holding
    // their verified phone. Complaints are keyed by that phone, so we return the
    // caller's own history here.
    const jsonSession = req.cookies.get('session')?.value
    if (jsonSession) {
      try {
        const s = JSON.parse(jsonSession)
        if (s?.phone) {
          const complaints = getComplaintsByPhone(s.phone)
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

    // Staff (police/admin) log in via username/password, which stores an
    // "auth_session" id cookie backed by the in-memory session store.
    const sessionId = req.cookies.get('auth_session')?.value
    if (sessionId) {
      const session = getSession(sessionId)
      if (session) {
        let complaints: any[] = []
        if (session.role === 'POLICE') {
          complaints = getComplaintsByJurisdiction(session.jurisdiction || '')
        } else if (session.role === 'ADMIN') {
          complaints = getAllComplaints()
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
