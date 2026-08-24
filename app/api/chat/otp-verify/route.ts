import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Endpoint for in-chat OTP verification (when user is not pre-authenticated)
 * This creates a session after OTP verification so user stays signed in for the chat
 */
export async function POST(req: NextRequest) {
  try {
    const { phone, otp } = await req.json()

    // Validate inputs
    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }

    if (!otp || !/^\d{4,6}$/.test(otp)) {
      return NextResponse.json(
        { error: 'Invalid OTP format' },
        { status: 400 }
      )
    }

    // In production, verify OTP from cache (Redis, etc.)
    // For demo, accept any 4-6 digit OTP
    // const storedOtp = await redis.get(`otp:${phone}`)
    // if (storedOtp !== otp || isExpired) { return error }

    // Create session with phone number
    const user = {
      userId: `complainant_${phone}`,
      username: `+91${phone}`,
      phone: phone,
      role: 'COMPLAINANT',
      authMethod: 'OTP_CHAT',
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    console.log(`[Chat OTP Verify] User verified via chat OTP: +91${phone}`)

    return NextResponse.json(
      {
        success: true,
        message: 'OTP verified. Session established.',
        user,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Chat OTP Verify] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    )
  }
}
