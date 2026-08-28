import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { runIDA } from '@/lib/agents/ida'
import { runRouter } from '@/lib/agents/router'
import { runFileComplaint } from '@/lib/agents/fileComplaint'
import { runRetrieval } from '@/lib/agents/retrieval'
import { runFallback } from '@/lib/agents/fallback'

export const maxDuration = 60 // Vercel function timeout (seconds)

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw Object.assign(new Error('OPENAI_API_KEY is not configured'), { status: 401 })
  }
  return new OpenAI({ apiKey })
}

type ExtractedDetails = NonNullable<Awaited<ReturnType<typeof runIDA>>['extracted']>

function buildExtractionChecklist(extracted?: ExtractedDetails) {
  if (!extracted) return undefined

  const recipient = [
    extracted.destination_vpa_or_account,
    extracted.recipient_name,
    extracted.recipient_phone,
  ].filter(Boolean).join(' · ')

  const timeDisplay = extracted.time_since_fraud_minutes
    ? `${extracted.time_display || formatTimeAgo(extracted.time_since_fraud_minutes)}`
    : null

  const items = [
    { label: 'Transaction ID / UTR', value: extracted.utr_or_transaction_id || extracted.phonepe_transaction_id || null },
    { label: 'Amount involved', value: extracted.amount_stolen ? `₹${extracted.amount_stolen}` : null },
    { label: 'Recipient VPA, mobile, or account', value: recipient || null },
    { label: 'Time since incident', value: timeDisplay || null },
    { label: 'Sender bank (from/debited)', value: extracted.sender_bank || null },
    { label: 'Receiver bank (to)', value: extracted.receiver_bank || null },
    { label: 'Payment method', value: extracted.payment_platform || null },
  ]
  const hasExtractedValue = items.some((item) => item.value)

  if (!hasExtractedValue) return undefined

  return {
    items,
    remaining: items.filter((item) => !item.value).map((item) => item.label),
  }
}

function formatTimeAgo(minutes: number | null | undefined): string {
  if (!minutes || minutes < 0) return 'Unknown time'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years > 1 ? 's' : ''} ago`
}

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenAI()
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
    // Accumulate from ALL previous assistant messages, not just the most recent
    for (const msg of history) {
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
        extraction: buildExtractionChecklist(idaResult.extracted),
        goldenHour: idaResult.extracted?.golden_hour_active === true,
        route: route.route_to,
      },
    })
  } catch (error) {
    console.error('[CCRP] Chat API error:', error)
    const upstreamStatus =
      typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
        ? error.status
        : null
    const isConfigurationError = upstreamStatus === 401 || upstreamStatus === 403

    return NextResponse.json(
      {
        message:
          isConfigurationError
            ? 'I could not analyze the uploaded file because the secure AI service is not configured correctly. No transaction values were extracted. Please try again after the service configuration is fixed, or call **1930** (National Cyber Helpline, available 24x7 and free) for urgent fraud.'
            : 'I could not analyze the uploaded file due to a technical issue. No transaction values were extracted. Please try again, or call **1930** (National Cyber Helpline, available 24x7 and free) for urgent fraud.',
        metadata: {},
      },
      { status: isConfigurationError ? 503 : 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Cyber Crime Reporting Portal Chat API is running',
    timestamp: new Date().toISOString(),
  })
}
