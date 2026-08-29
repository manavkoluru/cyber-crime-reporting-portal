import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import OpenAI from 'openai'
import { getSession, storeReady } from '@/lib/store'
import { runIDA } from '@/lib/agents/ida'
import { runRouter } from '@/lib/agents/router'
import { runFileComplaint, NARRATIVE_SENTINEL } from '@/lib/agents/fileComplaint'
import { runRetrieval } from '@/lib/agents/retrieval'
import { runFallback } from '@/lib/agents/fallback'
import {
  runClassifier,
  buildClassificationPreamble,
  SUBCATEGORY_LABEL,
  TOP_LEVEL_CATEGORY,
} from '@/lib/classification'
import type { ClassificationOverlap, FinanceFraudSubCategory } from '@/lib/classification'

const RECLASSIFY_CONFIDENCE = 0.85

export const maxDuration = 60 // Vercel function timeout (seconds)

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw Object.assign(new Error('OPENAI_API_KEY is not configured'), { status: 401 })
  }
  return new OpenAI({ apiKey })
}

type ExtractedDetails = NonNullable<Awaited<ReturnType<typeof runIDA>>['extracted']>

function buildExtractionChecklist(
  extracted?: ExtractedDetails,
  opts: { alwaysShow?: boolean } = {}
) {
  const e = extracted ?? ({} as ExtractedDetails)

  const recipient = [
    e.destination_vpa_or_account,
    e.recipient_name,
    e.recipient_phone,
  ].filter(Boolean).join(' · ')

  const timeDisplay = e.time_since_fraud_minutes
    ? `${e.time_display || formatTimeAgo(e.time_since_fraud_minutes)}`
    : null

  const items = [
    { label: 'Transaction ID / UTR', value: e.utr_or_transaction_id || e.phonepe_transaction_id || null },
    { label: 'Amount involved', value: e.amount_stolen ? `₹${e.amount_stolen}` : null },
    { label: 'Time since incident', value: timeDisplay || null },
    { label: 'Your phone number', value: e.user_phone || null },
    { label: 'Your location / pincode', value: e.user_location || null },
    { label: 'Payment method', value: e.payment_platform || null },
    { label: 'Sender bank (from/debited)', value: e.sender_bank || null },
    { label: 'Recipient VPA, mobile, or account', value: recipient || null, optional: true },
    { label: 'Receiver bank (to)', value: e.receiver_bank || null, optional: true },
  ]
  const hasExtractedValue = items.some((item) => item.value)

  // Show the checklist as soon as ANYTHING is extracted, OR unconditionally when the
  // caller asks (the first File-Complaint turn shows it as the "here's what I need" list).
  if (!hasExtractedValue && !opts.alwaysShow) return undefined

  return {
    items,
    remaining: items.filter((item) => !item.value && !item.optional).map((item) => item.label),
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

type ChatResult = {
  status: number
  message: string
  metadata: Record<string, unknown>
}

type ProgressReporter = (message: string) => void
type DeltaReporter = (text: string) => void

async function processChat(
  req: NextRequest,
  reportProgress: ProgressReporter,
  reportDelta: DeltaReporter
): Promise<ChatResult> {
  try {
    reportProgress('Preparing your secure report…')
    await storeReady // don't file on top of an un-loaded complaint set
    const openai = getOpenAI()
    const formData = await req.formData()
    const message = (formData.get('message') as string) || ''
    const sessionId = (formData.get('sessionId') as string) || ''
    const history = JSON.parse((formData.get('history') as string) || '[]')
    const file = formData.get('file') as File | null

    // Determine authentication. Two login systems exist:
    //  - OTP login   -> `session` cookie (JSON) carrying `phone`
    //  - user/pass    -> `auth_session` cookie (opaque id) resolved via the staff store
    // Any logged-in user counts as authenticated; phone is used to pre-fill the complaint if present.
    let phoneFromSession: string | null = null
    let complainantUserId: string | null = null
    let isAuthenticated = false
    try {
      const cookieStore = await cookies()

      const sessionCookie = cookieStore.get('session')?.value
      if (sessionCookie) {
        const session = JSON.parse(sessionCookie)
        if (session?.userId) {
          isAuthenticated = true
          phoneFromSession = session.phone || null
          complainantUserId = String(session.userId)
          console.log(`[Chat API] Authenticated via OTP session${phoneFromSession ? `, phone +91${phoneFromSession}` : ''}`)
        }
      }

      if (!isAuthenticated) {
        const authSessionId = cookieStore.get('auth_session')?.value
        const staffSession = authSessionId ? getSession(authSessionId) : undefined
        if (staffSession) {
          isAuthenticated = true
          complainantUserId = staffSession.userId
          console.log('[Chat API] Authenticated via username/password session')
        }
      }
    } catch (err) {
      // Cookie may not exist / be malformed – treat as unauthenticated.
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

    // — Recover previously accumulated state.
    // The client echoes each assistant message's metadata back in `history`, so the
    // most recent `extractedState` is the authoritative running state for this session.
    let accumulatedExtracted: any = {}
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i]
      if (msg.role === 'assistant' && msg.metadata?.extractedState) {
        accumulatedExtracted = { ...msg.metadata.extractedState }
        break
      }
    }

    // — Step 1: Intent Discovery Agent (always first)
    reportProgress(file ? 'Reading the uploaded evidence…' : 'Analyzing your report…')
    const idaResult = await runIDA(
      openai,
      message || fileDescription,
      history,
      fileBase64,
      fileMediaType,
      accumulatedExtracted && Object.keys(accumulatedExtracted).length > 0 ? accumulatedExtracted : undefined
    )

    // Merge running state with this turn's fresh extraction.
    // A fresh NON-EMPTY value wins; a null/undefined/'' from this turn must NOT
    // clobber a value we already accumulated in earlier turns.
    const mergedExtracted: any = { ...accumulatedExtracted }
    const fresh = (idaResult.extracted || {}) as Record<string, any>
    for (const [k, v] of Object.entries(fresh)) {
      if (v !== null && v !== undefined && v !== '') {
        mergedExtracted[k] = v
      }
    }
    idaResult.extracted = mergedExtracted
    const resolvedLocation = mergedExtracted.user_location || accumulatedExtracted.user_location || undefined

    // — Step 2: Route
    const route = await runRouter(idaResult)

    // Sticky File-Complaint: once a complaint is in progress, every follow-up user
    // turn stays with the File-Complaint agent, even if IDA reads this message as
    // off-topic (e.g. an emotional disclosure during the "modify" step). That path
    // owns re-classification, overlap detection, and the urgent-helpline notice.
    const complaintInProgress =
      !!accumulatedExtracted.classification ||
      history.some(
        (m: any) =>
          m.role === 'assistant' &&
          (m.metadata?.agent === 'File Complaint' ||
            m.metadata?.agent === 'Classification' ||
            m.metadata?.awaitingModification ||
            m.metadata?.awaitingClassificationAck ||
            (m.metadata?.extractedState && Object.keys(m.metadata.extractedState).length > 2))
      )
    if (
      complaintInProgress &&
      route.route_to !== 'FILE_COMPLAINT_AGENT' &&
      route.route_to !== 'RETRIEVAL_AGENT' // a genuine "check my status" can still leave
    ) {
      route.route_to = 'FILE_COMPLAINT_AGENT'
      route.reason = 'Sticky: complaint in progress, keeping this turn in File-Complaint'
    }

    // — Step 3: Run action agent
    let agentResponse: { message: string; metadata: Record<string, unknown> } = {
      message: '',
      metadata: {},
    }

    switch (route.route_to) {
      case 'FILE_COMPLAINT_AGENT': {
        type StoredClassification = {
          subCategory?: FinanceFraudSubCategory
          confidence?: number
          explanation?: string
          preambleShown?: boolean
          overlaps?: ClassificationOverlap[]
          overlapUrgent?: boolean
          reclassifiedFrom?: FinanceFraudSubCategory
          noticeShown?: boolean
        }
        const prevClassification = accumulatedExtracted.classification as
          | StoredClassification
          | undefined
        let classification: StoredClassification | undefined = prevClassification
        let classificationPreamble: string | undefined

        // Turns that carry fresh free-text the user expects us to REASSESS (re-classify,
        // detect non-financial overlaps, escalate): the dedicated narrative reply, and
        // any message in the "modify before filing" loop.
        const lastAssistant = [...history].reverse().find((m: any) => m.role === 'assistant')
        const lastAssistantText = String(lastAssistant?.content ?? '').toLowerCase()
        const wordCount = message.trim().split(/\s+/).length
        const isNarrativeTurn =
          !!lastAssistant &&
          lastAssistantText.includes(NARRATIVE_SENTINEL) &&
          wordCount >= 4
        const isModifyTurn =
          !!lastAssistant &&
          lastAssistantText.includes('what would you like to modify') &&
          wordCount >= 4
        const isReassessTurn = isNarrativeTurn || isModifyTurn

        // A clean yes/no/short answer to the file prompt is NOT new narrative — don't
        // let the reclassify/overlap notice hijack a legitimate confirmation turn.
        // (A NEW overlap still breaks through below, that check is separate.)
        const isBareConfirmAnswer =
          wordCount <= 5 &&
          /^(yes|yep|yeah|ok|okay|sure|no|nope|not now|not yet|file it|yes file it|yes, file it\.?|go ahead|proceed|confirm|cancel|stop|wait)[.! ]*$/.test(
            message.trim().toLowerCase()
          )

        let reclassified: { from: FinanceFraudSubCategory; to: FinanceFraudSubCategory } | undefined
        let freshOverlaps: ClassificationOverlap[] = prevClassification?.overlaps ?? []
        let freshOverlapUrgent = !!prevClassification?.overlapUrgent

        // Skip re-classification entirely on a bare yes/no to the file prompt: it
        // carries no new narrative, and re-scanning the OLD narrative here would
        // wrongly block a legitimate confirmation.
        try {
          if (isBareConfirmAnswer) throw { __skip: true }
          reportProgress('Checking the report category and safety details…')
          const c = await runClassifier(openai, {
            text: [message, mergedExtracted.fraud_narrative].filter(Boolean).join('\n\n'),
            knownDetails: mergedExtracted,
          })
          // Overlaps + urgency come back on EVERY classifier result, including FALLBACK
          // (e.g. a non-delivery dispute that also carries a blackmail threat). Capture
          // them regardless of whether a financial sub-category was assigned.
          freshOverlaps = c.overlaps
          freshOverlapUrgent = c.overlapUrgent
          if (c.status === 'CLASSIFIED' && c.subCategory) {
            const prevSub = prevClassification?.subCategory
            const differs = !!prevSub && c.subCategory !== prevSub
            // Only SWITCH sub-category on high confidence (or first classification).
            const switchNow = !prevSub || (differs && c.confidence >= RECLASSIFY_CONFIDENCE)

            const effectiveSub = switchNow ? c.subCategory : prevSub!
            if (!prevSub || (switchNow && differs)) {
              classificationPreamble = buildClassificationPreamble(effectiveSub)
            }
            if (switchNow && differs) {
              reclassified = { from: prevSub!, to: c.subCategory }
            }

            // If this reassess turn surfaced NEW overlap info that wasn't flagged
            // before, un-suppress the notice so a fresh escalation is always shown.
            const prevOverlapAreas = new Set(
              (prevClassification?.overlaps ?? []).map((o) => o.area)
            )
            const hasNewOverlap = freshOverlaps.some((o) => !prevOverlapAreas.has(o.area))
            const noticeShown =
              hasNewOverlap || (reclassified && isReassessTurn)
                ? false
                : prevClassification?.noticeShown

            classification = {
              subCategory: effectiveSub,
              confidence: c.confidence,
              explanation: switchNow ? c.explanation : prevClassification?.explanation,
              preambleShown:
                !!prevClassification?.preambleShown && !(switchNow && differs),
              overlaps: freshOverlaps,
              overlapUrgent: freshOverlapUrgent,
              reclassifiedFrom: reclassified?.from ?? prevClassification?.reclassifiedFrom,
              noticeShown,
            }
          } else {
            // Not CLASSIFIED (FALLBACK / CLARIFY) but overlaps may still be present.
            // Keep any prior sub-category; just carry the fresh overlap info forward.
            const prevAreasLocal = new Set(
              (prevClassification?.overlaps ?? []).map((o) => o.area)
            )
            const hasNew = freshOverlaps.some((o) => !prevAreasLocal.has(o.area))
            classification = {
              ...prevClassification,
              overlaps: freshOverlaps,
              overlapUrgent: freshOverlapUrgent,
              noticeShown: hasNew ? false : prevClassification?.noticeShown,
            }
          }
        } catch (e) {
          if (!(e && (e as any).__skip)) {
            console.error('[Chat API] classification failed (non-fatal):', e)
          }
        }
        mergedExtracted.classification = classification

        // — GLOBAL SAFETY GATE. Runs on EVERY File-Complaint turn, not just narrative /
        //   modify turns. If this message surfaced a NEW non-financial overlap (harassment,
        //   women & children, extortion, stalking, data breach), OR we reclassified,
        //   respond with that as its OWN turn. NEVER file on a turn where a fresh overlap
        //   appeared. Filing requires the user to come back with an explicit "file it".
        const prevAreas = new Set((prevClassification?.overlaps ?? []).map((o) => o.area))
        const newOverlaps = freshOverlaps.filter((o) => !prevAreas.has(o.area))
        const hasNewOverlapNow = newOverlaps.length > 0
        // Say something if: we reclassified, OR a brand-new overlap appeared (always,
        // even if a notice was shown before), OR there are overlaps not yet acknowledged.
        const hasSomethingToSay =
          !!reclassified ||
          hasNewOverlapNow ||
          (freshOverlaps.length > 0 && !classification?.noticeShown)

        // A reclassification alone should not interrupt a bare "yes/no" to the file
        // prompt. A brand-new overlap always breaks through, even then.
        const shouldSurface =
          (hasNewOverlapNow && !classification?.noticeShown) ||
          (!isBareConfirmAnswer && (isReassessTurn || !!reclassified) && hasSomethingToSay)

        if (shouldSurface) {
          const primarySub =
            classification?.subCategory ??
            (prevClassification?.subCategory as FinanceFraudSubCategory | undefined)
          const hasUrgentOverlap = freshOverlaps.some((o) => o.urgent)
          const parts: string[] = []

          if (reclassified) {
            parts.push(
              `Reading your description, this is closer to **${SUBCATEGORY_LABEL[reclassified.to]}** than ${SUBCATEGORY_LABEL[reclassified.from]}, so I'm recording it under that.`
            )
            if (classificationPreamble) parts.push(classificationPreamble)
          }

          if (freshOverlaps.length > 0) {
            const names = freshOverlaps.map((o) => `**${o.label}**`).join(', ')
            if (hasUrgentOverlap) {
              // Empathetic, urgent, on the user's side.
              parts.push(
                `I hear you, and I'm really sorry you're dealing with this. What you've described involves ${names}, and that is serious. **You have been wronged, and none of this is your fault.**`
              )
              parts.push(
                `Please call **1930** (the national cyber helpline) right now, and dial **112** if anyone is in immediate danger. Do not let anyone pressure you into staying silent. Reporting is your right.`
              )
              parts.push(
                `Rakshak AI does not yet fully support complaints in these areas, but we are working hard to add them. For now, 1930 is the fastest way to get the right help on this.`
              )
              if (primarySub) {
                parts.push(
                  `I can still help you file the financial-fraud part (**${SUBCATEGORY_LABEL[primarySub]}**, under "${TOP_LEVEL_CATEGORY}") whenever you're ready, but only if and when you want to. I will not file anything without you telling me to.`
                )
              }
            } else {
              parts.push(
                primarySub
                  ? `I'm filing this as **${SUBCATEGORY_LABEL[primarySub]}**, under "${TOP_LEVEL_CATEGORY}". What you've described also touches ${names}. Rakshak AI can only file the financial-fraud part; those other areas aren't supported here yet.`
                  : `What you've described also touches ${names}, which Rakshak AI can't file here yet.`
              )
            }
          }

          parts.push(
            hasUrgentOverlap
              ? primarySub
                ? 'When you feel ready, tell me if you\'d still like to go ahead with the financial-fraud complaint, or say "not now" and we can pause.'
                : 'I\'m here whenever you want to talk this through. If there is a financial-fraud part you also want to report, tell me and we can work on that together.'
              : isModifyTurn
                ? 'Once you\'ve noted that, tell me the single detail you want to change and what it should be.'
                : 'When you\'re ready, say "continue" and I\'ll show you the summary to file.'
          )

          classification = { ...classification, noticeShown: true }
          mergedExtracted.classification = classification

          agentResponse = {
            message: parts.join('\n\n'),
            metadata: {
              agent: 'Classification',
              priority: hasUrgentOverlap ? 'URGENT' : 'NORMAL',
              awaitingClassificationAck: !isModifyTurn,
              awaitingModification: isModifyTurn,
              overlaps: freshOverlaps.map((o) => ({
                label: o.label,
                note: o.note,
                urgent: o.urgent,
              })),
              callHelpline: hasUrgentOverlap
                ? { number: '1930', reason: 'A non-financial part of this report may be urgent.' }
                : undefined,
              extractedState: { ...mergedExtracted, classification },
            },
          }
          break
        }

        // Belt-and-braces: block filing on a turn where NEW overlap/danger signal
        // appeared, or where we reclassified. (A previously-acknowledged overlap does
        // NOT block, the user can still choose to file the financial part.)
        const blockFiling = hasNewOverlapNow || !!reclassified
        reportProgress('Preparing the next safe step…')
        agentResponse = await runFileComplaint(openai, message, history, idaResult, route, resolvedLocation, fileBase64, fileMediaType, idaResult.extracted, phoneFromSession, isAuthenticated, classificationPreamble, classification as Record<string, unknown> | undefined, blockFiling, complainantUserId, reportDelta)
        break
      }
      case 'RETRIEVAL_AGENT':
        // Pass phone from session so user doesn't need to re-enter it
        reportProgress('Looking up your complaint details…')
        agentResponse = await runRetrieval(openai, message, history, idaResult, phoneFromSession, reportDelta)
        break
      case 'FALLBACK_AGENT':
        reportProgress('Preparing a response…')
        agentResponse = await runFallback(openai, message, history, idaResult, reportDelta)
        break
      default:
        // IDA handled it – surface the conversational reply
        agentResponse = {
          message: idaResult.conversationalReply || "I'm here to help. Can you tell me more?",
          metadata: { agent: 'Intent Discovery', priority: 'NORMAL' },
        }
    }

    return {
      status: 200,
      message: agentResponse.message,
      metadata: {
        ...agentResponse.metadata,
        // Persist the running state on EVERY turn, not just File-Complaint turns,
        // so info extracted during small talk / fallback isn't dropped.
        // (File-Complaint returns its own richer extractedState which wins here.)
        extractedState: {
          ...mergedExtracted,
          user_location: resolvedLocation,
          ...(agentResponse.metadata?.extractedState as Record<string, unknown> | undefined),
        },
        extraction: buildExtractionChecklist(idaResult.extracted, {
          alwaysShow: route.route_to === 'FILE_COMPLAINT_AGENT',
        }),
        goldenHour: idaResult.extracted?.golden_hour_active === true,
        route: route.route_to,
      },
    }
  } catch (error) {
    console.error('[CCRP] Chat API error:', error)
    const upstreamStatus =
      typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
        ? error.status
        : null
    const isConfigurationError = upstreamStatus === 401 || upstreamStatus === 403

    return {
      status: isConfigurationError ? 503 : 500,
      message:
            isConfigurationError
              ? 'I could not analyze the uploaded file because the secure AI service is not configured correctly. No transaction values were extracted. Please try again after the service configuration is fixed, or call **1930** (National Cyber Helpline, available 24x7 and free) for urgent fraud.'
              : 'I could not analyze the uploaded file due to a technical issue. No transaction values were extracted. Please try again, or call **1930** (National Cyber Helpline, available 24x7 and free) for urgent fraud.',
      metadata: {},
    }
  }
}

function encodeEvent(encoder: TextEncoder, event: string, payload: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => controller.enqueue(encodeEvent(encoder, event, payload))
      try {
        send('progress', { message: 'Starting secure analysis…' })
        let sentLiveText = false
        const result = await processChat(
          req,
          (message) => send('progress', { message }),
          (text) => {
            sentLiveText = true
            send('delta', { text })
          }
        )

        // The orchestration agents make safety and filing decisions before text can be
        // exposed. Once that work is complete, deliver the answer incrementally so the
        // UI can render it without waiting for one large JSON payload.
        if (!sentLiveText) {
          for (const chunk of result.message.match(/\S+\s*/g) ?? []) {
            send('delta', { text: chunk })
          }
        }
        send('metadata', { metadata: result.metadata, status: result.status })
        send('done', {})
      } catch (error) {
        console.error('[CCRP] Stream setup error:', error)
        send('error', {
          message: 'I could not process that safely right now. Please try again, or call **1930** for urgent fraud.',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

export async function GET() {
  return NextResponse.json({
    message: 'Cyber Crime Reporting Portal Chat API is running',
    timestamp: new Date().toISOString(),
  })
}
