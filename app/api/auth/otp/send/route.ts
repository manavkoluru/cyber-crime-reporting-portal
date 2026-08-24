import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json()

    // Validate phone number
    if (!phone || !/^\d{10}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please enter a 10-digit number.' },
        { status: 400 }
      )
    }

    // In a real app, you would integrate with an SMS service like Twilio, AWS SNS, etc.
    // For demo purposes, we'll generate a random OTP and log it
    const otp = Math.floor(1000 + Math.random() * 9000).toString() // 4-digit OTP

    console.log(`[OTP Demo] Phone: +91${phone}, OTP: ${otp}`)

    // Store OTP temporarily (in production, use Redis or similar)
    // For demo, we'll just accept any 4-6 digit code in the verify endpoint
    // In real implementation, you'd store this with expiration

    return NextResponse.json(
      {
        success: true,
        message: 'OTP sent successfully',
        // In demo mode, we'll show the OTP for testing
        demo_otp: otp,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('OTP send error:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    )
  }
}
