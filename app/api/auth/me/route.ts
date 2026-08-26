import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserById } from '@/lib/store'

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value

    if (sessionCookie) {
      const session = JSON.parse(sessionCookie)
      if (session?.userId) {
        return NextResponse.json({ userId: session.userId, username: session.username, phone: session.phone, role: session.role, authMethod: session.authMethod })
      }
    }

    const authSession = req.cookies.get('auth_session')?.value
    const staffSession = authSession ? getSession(authSession) : undefined
    const user = staffSession ? getUserById(staffSession.userId) : undefined
    if (staffSession && user) {
      return NextResponse.json({ userId: user.id, username: user.username, phone: user.phone, role: user.role, authMethod: 'PASSWORD', jurisdiction: user.jurisdiction })
    }
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  } catch (error) {
    console.error('[Auth] ME endpoint error:', error)
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }
}
