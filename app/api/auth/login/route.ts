import { NextRequest, NextResponse } from 'next/server'
import { findUserByUsername } from '@/lib/store'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      )
    }

    const user = findUserByUsername(username)
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Keep the demo login stateless so it works across Vercel serverless instances.
    // This intentionally matches the existing OTP session shape. Replace this with a
    // signed session or Redis-backed session before treating this as production auth.
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        jurisdiction: user.jurisdiction,
      },
    })

    response.cookies.set(
      'session',
      JSON.stringify({
        userId: user.id,
        username: user.username,
        phone: user.phone,
        role: user.role,
        jurisdiction: user.jurisdiction,
        authMethod: 'PASSWORD',
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60,
        path: '/',
      }
    )

    return response
  } catch (error) {
    console.error('[Auth] Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
