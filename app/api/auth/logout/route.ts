import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('session')
    response.cookies.delete('auth_session')
    return response
  } catch (error) {
    console.error('[Auth] Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}
