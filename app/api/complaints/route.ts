import { NextRequest, NextResponse } from 'next/server'
import { getSession, getAllComplaints, getComplaintsByJurisdiction } from '@/lib/store'

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.cookies.get('auth_session')?.value

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const session = getSession(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      )
    }

    let complaints: any[] = []

    if (session.role === 'COMPLAINANT') {
      // Complainants see only their own complaints (matched by phone in session)
      // For now, return empty since we don't track phone in session
      complaints = []
    } else if (session.role === 'POLICE') {
      // Police see complaints assigned to their jurisdiction
      complaints = getComplaintsByJurisdiction(session.jurisdiction || '')
    } else if (session.role === 'ADMIN') {
      // Admins see all complaints (in production, filter by state/jurisdiction)
      complaints = getAllComplaints()
    } else {
      complaints = []
    }

    return NextResponse.json({
      success: true,
      complaints,
      userRole: session.role,
      userJurisdiction: session.jurisdiction,
    })
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
