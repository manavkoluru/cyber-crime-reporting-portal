import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { runIDA } from '@/lib/agents/ida'
import { runRouter } from '@/lib/agents/router'
import { runFileComplaint } from '@/lib/agents/fileComplaint'
import { runRetrieval } from '@/lib/agents/retrieval'
import { runFallback } from '@/lib/agents/fallback'

export const maxDuration = 60 // Vercel function timeout (seconds)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const message = (formData.get('message') as string) || ''
    const sessionId = (formData.get('sessionId') as string) || ''
    const history = JSON.parse((formData.get('history') as string) || '[]')
    const file = formData.get('file') as File | null

    // Extract phone number from OTP session if user logged in via mobile
    let phoneFromSession: string | null = null
    try {
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get('session')?.value
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie)
        phoneFromSession = session.phone || null
        if (phoneFromSession) {
          console.log(`[Chat API] User logged in via OTP, phone available: +91${phoneFromSession}`)
        }
      }
    } catch (err) {
      // Session cookie may not exist, continue without it
    }

    // — Process uploaded file
    let fileBase64: string | null = null
    let fileMediaType: string | null = null
    let fileDescription = ''

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      fileBase64 = buffer.toString('base64')
      fileMediaType = file.type

      if (file.type.startsWith('image/')) {
        fileDescription = `User uploaded an image named "${file.name}". Analyze it carefully for transaction details.`
      } else if (file.type === 'application/pdf') {
        fileDescription = `User uploaded a PDF named "${file.name}". Extract any transaction/payment information visible.`
      }
    }

    // — Extract previously accumulated state from chat history
    let accumulatedExtracted: any = {}
    for (const msg of history.slice().reverse()) {
      if (msg.role === 'assistant') {
        // Try to extract previously identified fields from bot responses
        if (msg.content.includes('Transaction ID') || msg.content.includes('UTR') || msg.content.includes('₹')) {
          // Parse bot's previous message for data (this helps maintain context)
          const utrMatch = msg.content.match(/(?:UTR|Transaction ID|URN)[\s:]*([A-Z0-9]{10,})/i)
          if (utrMatch && !accumulatedExtracted.utr_or_transaction_id) {
            accumulatedExtracted.utr_or_transaction_id = utrMatch[1]
          }

          const amountMatch = msg.content.match(/₹([\d,]+)/);
          if (amountMatch && !accumulatedExtracted.amount_stolen) {
            accumulatedExtracted.amount_stolen = amountMatch[1].replace(/,/g, '')
          }

          const vpaMatch = msg.content.match(/(?:to|VPA|account)[\s:]*([a-z0-9.]+@[a-z]+)/i)
          if (vpaMatch && !accumulatedExtracted.destination_vpa_or_account) {
            accumulatedExtracted.destination_vpa_or_account = vpaMatch[1]
          }
        }
        break // Only check most recent assistant message
      }
    }

    // — Step 1: Intent Discovery Agent (always first)
    const idaResult = await runIDA(
      openai,
      message || fileDescription,
      history,
      fileBase64,
      fileMediaType,
      accumulatedExtracted && Object.keys(accumulatedExtracted).length > 0 ? accumulatedExtracted : undefined
    )

    // — Step 2: Route
    const route = await runRouter(idaResult)

    // — Step 3: Run action agent
    let agentResponse: { message: string; metadata: Record<string, unknown> } = {
      message: '',
      metadata: {},
    }

    switch (route.route_to) {
      case 'FILE_COMPLAINT_AGENT':
        // Pass extracted data to complaint agent to maintain context and pre-fill phone from session
        agentResponse = await runFileComplaint(openai, message, history, idaResult, route, idaResult.extracted?.user_location || undefined, fileBase64, fileMediaType, idaResult.extracted, phoneFromSession)
        break
      case 'RETRIEVAL_AGENT':
        // Pass phone from session so user doesn't need to re-enter it
        agentResponse = await runRetrieval(openai, message, history, idaResult, phoneFromSession)
        break
      case 'FALLBACK_AGENT':
        agentResponse = await runFallback(openai, message, history, idaResult)
        break
      default:
        // IDA handled it – surface the conversational reply
        agentResponse = {
          message: idaResult.conversationalReply || "I'm here to help. Can you tell me more?",
          metadata: { agent: 'Intent Discovery', priority: 'NORMAL' },
        }
    }

    return NextResponse.json({
      message: agentResponse.message,
      metadata: {
        ...agentResponse.metadata,
        goldenHour: idaResult.extracted?.golden_hour_active === true,
        route: route.route_to,
      },
    })
  } catch (error) {
    console.error('[CCRP] Chat API error:', error)
    return NextResponse.json(
      {
        message:
          'I apologize – I ran into a technical issue. Please try again, or call **1930** (National Cyber Helpline, available 24x7 and free).',
        metadata: {},
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Cyber Crime Reporting Portal Chat API is running',
    timestamp: new Date().toISOString(),
  })
}
