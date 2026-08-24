import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

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

    // In production, verify OTP from your SMS service or cache
    // For demo, accept any 4-6 digit OTP
    // In real implementation:
    // const storedOtp = await redis.get(`otp:${phone}`)
    // if (storedOtp !== otp || isExpired) { return error }

    // Create session with phone number
    const user = {
      userId: `complainant_${phone}`,
      username: `+91${phone}`,
      phone: phone,
      role: 'COMPLAINANT',
      authMethod: 'OTP',
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session', JSON.stringify(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return NextResponse.json(
      {
        success: true,
        message: 'OTP verified successfully',
        user,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('OTP verify error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    )
  }
}
