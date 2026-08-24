import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Parse session cookie (it's JSON)
    const session = JSON.parse(sessionCookie)

    if (!session || !session.userId) {
      return NextResponse.json(
        { error: 'Session invalid' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      userId: session.userId,
      username: session.username,
      phone: session.phone,
      role: session.role,
      authMethod: session.authMethod,
    })
  } catch (error) {
    console.error('[Auth] ME endpoint error:', error)
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }
}
