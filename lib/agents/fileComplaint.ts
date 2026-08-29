import OpenAI from 'openai'
import { IDARaw } from './ida'
import { RouteDecision } from './router'
import { addComplaint, getPincodeJurisdiction } from '@/lib/store'
import { decideFreezeAction } from '@/lib/freezeDecision'
import { formatTimeAgo } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

/**
 * The dedicated "tell me what happened in your own words" question always contains
 * this exact phrase. `route.ts` reuses it to detect the narrative-reply turn so the
 * two agree. See the NARRATIVE task instruction below.
 */
export const NARRATIVE_SENTINEL = 'in your own words, in a couple of sentences'

const FILE_COMPLAINT_SYSTEM_PROMPT = `You are the File Complaint Agent of the Cyber Crime Reporting Portal.
Your mission: Help fraud victims file a cybercrime complaint as FAST as possible.

## GOLDEN RULE: DO NOT RE-ASK FOR DATA ALREADY EXTRACTED
If a field appears in "CURRENT EXTRACTED STATE" section with a value, DO NOT ASK FOR IT.
Period. Full stop. This is your most important rule.

## Mandatory Fields for Complete Filing
1. ✅ Transaction ID / UTR (usually extracted from screenshot)
2. ✅ Amount stolen (usually extracted from screenshot)
3. ✅ Destination VPA/account (usually extracted from screenshot)
4. ✅ Time of fraud (usually extracted from screenshot)
5. ⚠️ User's phone number (MUST collect if not extracted)
6. ✅ User's location (may be extracted)
7. ⚠️ Fraud narrative (collect before filing)
8. ⚠️ Identity Verification (MUST verify phone with OTP if not pre-authenticated)

## Workflow - ONE QUESTION AT A TIME

**Step 1: Show Golden Hour Alert (if < 2 hours)**
"⚡ GOLDEN HOUR ACTIVE: Act now - funds may still be recoverable!"

**Step 2: List What We Have**
Show extracted values clearly. Example:
"✓ I have: ₹8400 to xyz@upi, Transaction ID: 770941216078"

**Step 3: Ask ONLY for Missing Fields**
Priority: Phone > Location > Narrative > OTP Verification
- If phone missing: "What's your phone number?"
- If location missing: "What's your pincode or city?"
- If narrative missing: "What happened? (1-2 sentences)"
- If OTP needed: "I've sent an OTP to your number. Please enter it to verify."

**Step 4: Confirmation**
"Ready to file? Confirm to proceed."

**Step 5: File & Show CCN**

## OTP VERIFICATION FLOW (Only if user not pre-authenticated)
- When user provides phone number, mention: "I'll send a verification code to this number."
- Wait for user to confirm or provide OTP
- Guide them: "Enter the 4-6 digit code you received"
- Once OTP is verified, proceed with filing

## CRITICAL INSTRUCTIONS
- READ the "CURRENT EXTRACTED STATE" - it lists what's ALREADY COLLECTED
- READ the "AUTHENTICATION STATUS" - it tells if OTP verification is needed
- If field is there with value, SKIP IT - don't ask again
- If field shows "NOT YET PROVIDED", ask for it ONCE only - NEVER ask the same field twice
- Do NOT combine questions
- Do NOT ask for Transaction ID, Amount, VPA, or Time if they're already in the state
- Check conversation history - if you already asked "What's your phone number?" don't ask again
- Be warm but fast
- Never ask for the same info twice in same conversation window - track what's been asked

## Output Format
Plain text only. No JSON, no code blocks.
Never use em dashes or en dashes (— or –). Use a comma, a period, or parentheses instead.
`

export async function runFileComplaint(
  openai: OpenAI,
  message: string,
  history: { role: string; content: string }[],
  idaResult: IDARaw,
  route: RouteDecision,
  userLocation?: string, // pincode or city
  fileBase64?: string | null,
  fileMediaType?: string | null,
  previousExtracted?: IDARaw['extracted'],
  phoneFromSession?: string | null, // Phone number from OTP login session (may be null for user/pass login)
  isAuthenticatedSession?: boolean, // True if the user is logged in via EITHER auth system
  classificationPreamble?: string, // Compact "filing this as X under BNS/IT Act ..." line — prepend to this reply
  classification?: Record<string, unknown>, // Cached classifier result; carried forward in extractedState
  blockFiling?: boolean, // Hard stop: caller says this turn must NOT result in a filed complaint
  complainantUserId?: string | null, // Logged-in complainant's user id; stamped on the filed complaint
  onDelta?: (text: string) => void
): Promise<{ message: string; metadata: Record<string, unknown> }> {
  // Merge previous extracted data with current (current takes precedence)
  let ext = { ...previousExtracted, ...idaResult.extracted }

  // Pre-fill phone from session if user logged in via OTP
  if (phoneFromSession && !ext.user_phone) {
    ext = { ...ext, user_phone: phoneFromSession }
    console.log(`[FileComplaint] Pre-filled phone from OTP session: ${phoneFromSession}`)
  }

  // A logged-in user is authenticated regardless of which login system they used.
  // OTP verification is only for anonymous users proving ownership of a phone number.
  const isUserAuthenticated = !!isAuthenticatedSession || !!phoneFromSession

  // The victim must give the "what happened" statement in their own words as a direct
  // reply to the DEDICATED narrative question. A narrative that IDA merely scraped from
  // an earlier message or an image caption does NOT count until confirmed in this step.
  //
  // The dedicated question always contains this exact sentinel phrase (see the NARRATIVE
  // TASK instruction below). We match on the sentinel only — NOT loose phrases like
  // "what happened", which also appear in the greeting and the modify prompt and were
  // previously causing this whole step to be skipped from turn 1.
  const prevNarrativeConfirmed = !!(previousExtracted as any)?.narrative_confirmed
  const lastAssistantMsg = [...history].reverse().find((m) => m.role === 'assistant')
  const justAskedForNarrative =
    !!lastAssistantMsg && lastAssistantMsg.content.toLowerCase().includes(NARRATIVE_SENTINEL)
  const userJustAnsweredNarrative =
    justAskedForNarrative && message.trim().split(/\s+/).length >= 4
  const narrativeConfirmed = prevNarrativeConfirmed || userJustAnsweredNarrative

  // If the user just gave their statement, capture it verbatim as the narrative.
  if (userJustAnsweredNarrative && message.trim().length > (ext.fraud_narrative?.length || 0)) {
    ext = { ...ext, fraud_narrative: message.trim() }
  }

  // Check if we have all mandatory fields to file
  const hasDestinationInfo = !!(ext.destination_vpa_or_account || ext.recipient_phone || ext.recipient_name)
  const hasIncidentTime = typeof ext.time_since_fraud_minutes === 'number'
  const canFile = !!(
    ext.utr_or_transaction_id &&
    ext.amount_stolen &&
    hasDestinationInfo &&
    hasIncidentTime &&
    ext.user_phone &&
    userLocation &&
    ext.fraud_narrative &&
    narrativeConfirmed &&
    isUserAuthenticated // Can only file if authenticated or OTP verified
  )

  // Generate CCN if filing
  const ccn = canFile
    ? `CCN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
    : null

  // Format time nicely
  const formatTime = (minutes?: number | null): string => {
    if (!minutes) return 'Unknown time'
    if (minutes < 60) return `${minutes} minutes ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) > 1 ? 's' : ''} ago`
    if (minutes < 10080) return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) > 1 ? 's' : ''} ago`
    return `${Math.floor(minutes / 10080)} week${Math.floor(minutes / 10080) > 1 ? 's' : ''} ago`
  }

  // Track which fields are missing (check conversation history to avoid re-asking)
  const missingFields = []
  const recentConversation = history.slice(-10).map(m => m.content.toLowerCase()).join(' ')

  if (!ext.utr_or_transaction_id) missingFields.push('UTR_TRANSACTION_ID')
  if (!ext.amount_stolen) missingFields.push('AMOUNT')
  // Only ask for VPA_ACCOUNT if we don't have ANY destination info (VPA, phone, or name)
  if (!hasDestinationInfo) missingFields.push('VPA_ACCOUNT')
  if (!userLocation) missingFields.push('LOCATION')
  // Only ask for phone if not already provided AND not already asked in this conversation
  if (!ext.user_phone && !recentConversation.includes('phone number')) {
    missingFields.push('PHONE')
  }
  // Narrative is ALWAYS asked explicitly (last), even if IDA pre-filled fraud_narrative,
  // until the user has answered the "what happened" question in their own words.
  if (!narrativeConfirmed) missingFields.push('NARRATIVE')

  const fieldPriority = {
    UTR_TRANSACTION_ID: 1,
    AMOUNT: 2,
    VPA_ACCOUNT: 3,
    LOCATION: 4,
    PHONE: 5,
    NARRATIVE: 6,
  }
  const nextMissingField = missingFields.length > 0
    ? missingFields.sort((a, b) => (fieldPriority[a as keyof typeof fieldPriority] || 99) - (fieldPriority[b as keyof typeof fieldPriority] || 99))[0]
    : null

  const missingFieldLabels = {
    UTR_TRANSACTION_ID: 'Transaction ID / UTR',
    AMOUNT: 'Amount (in rupees)',
    VPA_ACCOUNT: 'Destination VPA or Account',
    SENDER_BANK: 'Your bank (debited from - MANDATORY)',
    LOCATION: 'Location (pincode or city)',
    PHONE: 'Phone number (for verification)',
    NARRATIVE: 'What happened (one or two short sentences)',
  }

  const missingFieldsList = missingFields.length === 0
    ? '✓ ALL FIELDS COLLECTED - Ready to file'
    : `⚠️ Missing ${missingFields.length} field(s) in priority order:\n${missingFields.map((f, i) => `   ${i + 1}. ${missingFieldLabels[f as keyof typeof missingFieldLabels]}`).join('\n')}`

  // These fields can be auto-extracted from an uploaded screenshot/PDF, so remind the
  // user they can upload instead of typing. Phone/location/narrative cannot, so no hint.
  const docExtractableFields = ['UTR_TRANSACTION_ID', 'AMOUNT', 'VPA_ACCOUNT']
  const uploadHint = docExtractableFields.includes(nextMissingField as string)
    ? ' End with exactly this sentence on its own line: "You can also upload documents or images, and I will auto-extract required data."'
    : ''

  const nextTaskInstructions = missingFields.length === 0
    ? 'TASK: Show a brief, friendly summary of the complaint details you have, then ask "Are you ready to file this complaint?". The UI shows the user Yes / No / Modify buttons, so do NOT write out a list of reply options or ask them to type yes/no. Do NOT ask for additional fields.'
    : nextMissingField === 'NARRATIVE'
      ? `TASK: Everything else is collected. Now ask the user to describe how the fraud unfolded, in their own words, in a couple of sentences. Reassure them you will use it to make sure the report is handled quickly and correctly (do NOT call it a "statement for the official record" or anything that sounds legal or scary). Your message MUST contain this exact phrase verbatim: "${NARRATIVE_SENTINEL}". Ask ONLY this. Do NOT summarise or offer to file yet.`
      : `TASK: Ask for the FIRST missing field ONLY: ${missingFieldLabels[nextMissingField as keyof typeof missingFieldLabels]}. Do NOT ask for multiple fields. Do NOT offer to file yet - a narrative statement is still needed after this.${uploadHint}`

  const authenticatedNextStep = nextMissingField
    ? `Your account is already verified. Please provide: ${missingFieldLabels[nextMissingField as keyof typeof missingFieldLabels]}.`
    : 'Your account is already verified. Should I file your complaint with these details?'

  // Build destination display for context
  const destinationDisplay = ext.destination_vpa_or_account
    ? ext.destination_vpa_or_account
    : [ext.recipient_name, ext.recipient_phone].filter(Boolean).join(' | ') || null

  const stateContext = `
## 🔒 AUTHENTICATION STATUS
${isUserAuthenticated ? `✅ User authenticated (pre-verified via OTP login)` : `⚠️ User NOT authenticated - OTP verification will be required before filing`}

## 🟢 EXTRACTED STATE (DO NOT ASK FOR THESE - ALREADY COLLECTED)
${ext.utr_or_transaction_id ? `✅ UTR/Transaction ID: ${ext.utr_or_transaction_id}` : `❌ Transaction ID: NOT PROVIDED`}
${ext.amount_stolen ? `✅ Amount: ₹${ext.amount_stolen}` : `❌ Amount: NOT PROVIDED`}
${destinationDisplay ? `✅ Destination/Recipient: ${destinationDisplay}` : `❌ Destination: NOT PROVIDED`}
${ext.payment_platform ? `✅ Platform: ${ext.payment_platform}` : `⚠️ Platform: Unknown`}
${ext.golden_hour_active ? `🔥 GOLDEN HOUR ACTIVE` : `⏳ Not urgent (>2 hours)`}
${userLocation ? `✅ Location: ${userLocation}` : `❌ Location: NOT PROVIDED`}
${ext.fraud_narrative ? `✅ What happened: ${ext.fraud_narrative}` : `❌ What happened: NOT PROVIDED`}

## 🔴 STILL NEED (ASK FOR THESE)
${ext.user_phone ? `✅ Phone: ${ext.user_phone}` : `❌ Phone: MUST COLLECT`}
${missingFieldsList}
${!isUserAuthenticated ? `\n⚠️ OTP Verification: Required after phone number is provided` : ''}

## USER JUST SAID
"${message}"

## WHAT TO DO NOW
${nextTaskInstructions}

GOLDEN RULE: If field shows ✅ above, DO NOT ASK FOR IT. Only ask for fields marked ❌ or from "STILL NEED" section.
IMPORTANT: If user provided phone number + name as recipient (number-to-number transfer), do NOT ask for VPA - that's complete destination info.
${!isUserAuthenticated ? `\nNOTE: User is not authenticated. After collecting phone number, guide them through OTP verification before filing.` : ''}
${isUserAuthenticated ? '\nABSOLUTE RULE: This user is already authenticated. Never ask for an OTP, a verification code, or a 4-6 digit code.' : ''}
`

  const recentHistory = history.slice(-6).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Build multimodal content if image is attached
  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' } }

  const userContent: ContentPart[] = [
    { type: 'text', text: message || 'Please help me file the complaint.' },
  ]

  if (fileBase64 && fileMediaType?.startsWith('image/')) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${fileMediaType};base64,${fileBase64}`,
        detail: 'high', // High detail to see transaction details in screenshots
      },
    })
  }

  // If we have extracted data from image, show summary first
  let summaryResponse = ''
  if (fileBase64 && fileMediaType?.startsWith('image/') && (ext.amount_stolen || ext.utr_or_transaction_id || ext.destination_vpa_or_account || ext.recipient_phone)) {
    const incidentTime = ext.time_since_fraud_minutes
      ? ext.time_since_fraud_minutes < 120 ? `${ext.time_since_fraud_minutes} minutes ago (⚡ GOLDEN HOUR ACTIVE)` : `${Math.floor(ext.time_since_fraud_minutes / 60)} hours ago`
      : 'Unknown'

    // Build recipient display from available info
    const recipientDisplay = ext.destination_vpa_or_account
      ? ext.destination_vpa_or_account
      : [ext.recipient_name, ext.recipient_phone].filter(Boolean).join(' | ') || 'Not readable'

    summaryResponse = `
✅ **I've analyzed your screenshot. Here's what I found:**

📊 **Transaction Details:**
• **Amount:** ₹${ext.amount_stolen || 'Not readable'}
• **Sent to:** ${recipientDisplay}
• **Transaction ID:** ${ext.utr_or_transaction_id || ext.phonepe_transaction_id || 'Not readable'}
• **Platform:** ${ext.payment_platform || 'Not identified'}
• **Time of incident:** ${incidentTime}
${ext.golden_hour_active ? '🔥 **⚡ GOLDEN HOUR ACTIVE - Funds may still be recoverable!**' : ''}

Now I need a few more details to file your complaint:
`
  }

  // Never stream a response that can later be replaced by the mandatory narrative
  // prompt, OTP guard, confirmation workflow, image summary, or filing receipt.
  // Ordinary one-field collection prompts are safe to render token-by-token.
  const messageLower = message.toLowerCase().trim()
  const messageWords = messageLower.split(/\s+/).length
  const likelyConfirmationAction =
    canFile &&
    (messageWords <= 12 &&
      /^(yes|yep|yeah|yes please|ok|okay|sure|go ahead|please go ahead|proceed|please proceed|file it|please file it|yes file it|yes, file it\.?|submit|confirm|confirmed|do it|go for it|no|nope|not now|don'?t file|do not file|cancel|stop|hold on|wait|not yet)/.test(
        messageLower
      ))
  const shouldStreamModelReply =
    !!onDelta &&
    !summaryResponse &&
    !classificationPreamble &&
    nextMissingField !== 'NARRATIVE' &&
    !likelyConfirmationAction &&
    !(ext.user_phone && !isUserAuthenticated && /\d{10}/.test(message))

  // — FIRST substantive File-Complaint turn: skip the LLM. Emit a short deterministic
  //   opener (classification + "here's what I need") and let the checklist UI carry the
  //   asks. No specific field question. Applies only when nothing has been collected yet
  //   AND no image was just processed AND we have not opened this flow before.
  const alreadyOpened = history.some(
    (m) => m.role === 'assistant' && /I'm filing this report as|here'?s what I need/i.test(m.content)
  )
  // "Nothing collected" = no transaction facts yet and the user has not answered the
  // dedicated narrative step. (IDA auto-fills `fraud_narrative` from the very first
  // message, so we deliberately do NOT check it here.)
  const nothingCollectedYet =
    !ext.utr_or_transaction_id &&
    !ext.amount_stolen &&
    typeof ext.time_since_fraud_minutes !== 'number' &&
    !hasDestinationInfo &&
    !userLocation &&
    !ext.user_phone &&
    !narrativeConfirmed
  if (!alreadyOpened && nothingCollectedYet && !summaryResponse) {
    // "This is typically dealt with under [law links]." — reuse the classifier's
    // preamble sentence, minus its own "I'm recording this as X" lead (we replace it).
    const lawSentence =
      classificationPreamble?.replace(/^.*?category\.\s*/i, '').trim() || ''
    const classLabel =
      classificationPreamble?.match(/recording this as \*\*([^*]+)\*\*/i)?.[1] ||
      (classification?.subCategory as string | undefined) ||
      'an online financial fraud'

    // Short echo of what the user said, for "Since you mentioned ...".
    const raw = message
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[.?!]+$/, '')
      .replace(/\s*,?\s*(and\s+)?(i\s+)?want(ed)?\s+to\s+(report|file).*$/i, '') // drop "...and want to report it"
      .replace(/^(i(\s+(was|am|'?ve|have|had|got|just))?|someone|there\s+was|my)\s+/i, '') // drop leading subject
      .trim()
    const hint =
      raw.length >= 4 && raw.length <= 120 ? raw.toLowerCase() : 'an online payment fraud'

    const opener =
      `Got it. Let's move quickly. Since you mentioned ${hint}, I'm filing this report as ` +
      `**${classLabel}**, under the "Online Financial Fraud" category.` +
      (lawSentence ? ` ${lawSentence}` : '') +
      `\n\nHere's what I need from you:\n\n` +
      `You can also upload documents or images, and I will auto-extract required data.`

    return {
      message: opener,
      metadata: {
        agent: 'File Complaint',
        priority: route.priority,
        userAuthenticated: isUserAuthenticated,
        extractedState: {
          utr_or_transaction_id: ext.utr_or_transaction_id,
          phonepe_transaction_id: ext.phonepe_transaction_id,
          amount_stolen: ext.amount_stolen,
          destination_vpa_or_account: ext.destination_vpa_or_account,
          recipient_name: ext.recipient_name,
          recipient_phone: ext.recipient_phone,
          fraud_narrative: ext.fraud_narrative,
          payment_platform: ext.payment_platform,
          time_since_fraud_minutes: ext.time_since_fraud_minutes,
          user_phone: ext.user_phone,
          user_location: userLocation,
          golden_hour_active: ext.golden_hour_active,
          narrative_confirmed: narrativeConfirmed,
          classification,
        },
      },
    }
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: FILE_COMPLAINT_SYSTEM_PROMPT + '\n\n' + stateContext },
        ...recentHistory,
        {
          role: 'user',
          content: userContent as any,
        },
      ],
      temperature: 0.3,
      max_tokens: 800,
      stream: shouldStreamModelReply,
    })

    // Belt-and-braces: replace any em/en dash the model still emits with a comma.
    const dedash = (s: string) =>
      s.replace(/\s+[—–]\s+/g, ', ').replace(/[—–]/g, ', ').replace(/,\s*,/g, ',')
    let rawResponseText = ''
    if (shouldStreamModelReply) {
      for await (const chunk of response as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
        const text = chunk.choices[0]?.delta?.content || ''
        rawResponseText += text
        if (text) onDelta?.(text)
      }
    } else {
      rawResponseText = (response as OpenAI.Chat.Completions.ChatCompletion).choices[0].message.content || ''
    }
    const responseText = dedash(rawResponseText || 'Please try again.')
    const asksForOtp = /\botp\b|verification code|4\s*[-–]\s*6\s*digit|enter.*code/i.test(responseText)
    // Guard against an LLM re-asking for a credential that the session has already verified.
    let safeResponseText = isUserAuthenticated && asksForOtp ? authenticatedNextStep : responseText

    // The narrative step is load-bearing: if the model forgot the sentinel phrase, the
    // next turn wouldn't recognise the user's reply as the statement. Force a clean ask.
    if (nextMissingField === 'NARRATIVE' && !responseText.toLowerCase().includes(NARRATIVE_SENTINEL)) {
      safeResponseText = `We have everything else on file. Now, ${NARRATIVE_SENTINEL}, please describe how the fraud unfolded. I will use this information to ensure that we are acting quickly and correctly.`
    }

    // — Confirmation-step intent detection (only meaningful once every field is collected).
    //   CONSENT MUST BE UNAMBIGUOUS. A message that merely contains the word "file"
    //   or "go ahead" inside a larger sentence about something else is NOT consent.
    const msgLower = message.toLowerCase().trim()
    const msgWords = msgLower.split(/\s+/).length

    // Explicit affirmative: the WHOLE message is a short yes ("yes", "yes file it",
    // "go ahead", "please file it", "confirm", "yes please"). Not a clause buried in prose.
    const userConfirmedFiling =
      /^(yes|yep|yeah|yes please|ok|okay|sure|go ahead|please go ahead|proceed|please proceed|file it|please file it|yes file it|yes, file it\.?|submit|confirm|confirmed|do it|go for it)[.! ]*$/.test(
        msgLower
      ) && msgWords <= 5

    // Explicit decline: short and clearly negative.
    const userDeclinedFiling =
      !userConfirmedFiling &&
      /^(no|nope|not now|don'?t file|do not file|cancel|stop|hold on|wait|not yet)[.! ]*$/.test(
        msgLower
      )

    // Modify: short and clearly asking to change a field.
    const userWantsModify =
      !userConfirmedFiling &&
      !userDeclinedFiling &&
      msgWords <= 12 &&
      /\b(modify|change|edit|correct|update|fix|amend)\b/.test(msgLower)

    // Modify loop: user wants to change something before filing.
    if (canFile && userWantsModify) {
      return {
        message:
          "No problem. Let's fix that before filing.\n\n**What would you like to modify?** Tell me which detail is wrong (for example: amount, transaction ID, phone number, location, or your description of what happened) and what it should be.",
        metadata: {
          agent: 'File Complaint',
          priority: route.priority,
          userAuthenticated: isUserAuthenticated,
          awaitingModification: true,
          extractedState: {
            utr_or_transaction_id: ext.utr_or_transaction_id,
            phonepe_transaction_id: ext.phonepe_transaction_id,
            amount_stolen: ext.amount_stolen,
            destination_vpa_or_account: ext.destination_vpa_or_account,
            recipient_name: ext.recipient_name,
            recipient_phone: ext.recipient_phone,
            fraud_narrative: ext.fraud_narrative,
            payment_platform: ext.payment_platform,
            time_since_fraud_minutes: ext.time_since_fraud_minutes,
            user_phone: ext.user_phone,
            user_location: userLocation,
            golden_hour_active: ext.golden_hour_active,
            narrative_confirmed: narrativeConfirmed,
            classification,
          },
        },
      }
    }

    // User explicitly declined to file.
    if (canFile && userDeclinedFiling) {
      safeResponseText =
        "That's completely okay. I have not filed anything, and I won't until you tell me you're ready. Your details are saved safely.\n\nTake the time you need. Whatever you decide, you have not done anything wrong here, and I'm always here whenever you want to continue, change a detail, or just talk it through. When you're ready, say \"file it\"."
    }

    // Prepend, in order: the classification preamble (first turn / re-classified only),
    // then the image summary, then the agent's reply.
    const alreadyPreambled = history
      .slice(-6)
      .some(
        (m) =>
          m.role === 'assistant' &&
          /I'm (recording|filing) this (as|report as) \*\*/.test(m.content)
      )
    const preamble =
      classificationPreamble && !alreadyPreambled ? `${classificationPreamble}\n\n` : ''
    const finalResponse = preamble + (summaryResponse ? summaryResponse + safeResponseText : safeResponseText)

    // Filing requires: a clean explicit "yes", all fields, a location, AND the caller
    // did not veto filing this turn (e.g. an overlap / danger signal was present).
    const isFilingComplaint = userConfirmedFiling && canFile && !!userLocation && !blockFiling

    // If filing, save complaint to in-memory store
    let savedComplaintId = ''
    let fileSuccessResponse = finalResponse

    if (isFilingComplaint && canFile && userLocation) {
      const jurisdiction = getPincodeJurisdiction(userLocation)
      const complaintId = `complaint_${uuidv4()}`

      try {
        const freezeDecision = decideFreezeAction({
          confidenceScore: idaResult.confidence || 0.7,
          amountInRupees: parseInt(String(ext.amount_stolen).replace(/,/g, '')) || 0,
          isGoldenHour: ext.golden_hour_active || false,
          currentHour: new Date().getHours(),
          fraudCategory: ext.fraud_category || 'UNKNOWN',
        })
        const workflowTimeline = [
          {
            timestamp: new Date(),
            action: 'Complaint filed',
            actor: 'COMPLAINANT',
            details: 'Your report was submitted to the portal.',
            state: 'COMPLETED' as const,
          },
          {
            timestamp: new Date(),
            action: 'Automated triage completed',
            actor: 'SYSTEM',
            details: freezeDecision.reason,
            state: 'COMPLETED' as const,
          },
          {
            timestamp: new Date(),
            action: freezeDecision.action === 'MANUAL_REVIEW' ? 'Awaiting portal review' : `Assigned to ${jurisdiction} Police Station`,
            actor: 'SYSTEM',
            details: freezeDecision.action === 'MANUAL_REVIEW'
              ? 'A reviewer will assess the available evidence and incident summary.'
              : 'Awaiting an officer decision on the next action.',
            state: 'CURRENT' as const,
          },
          {
            timestamp: new Date(),
            action: 'Receiver-bank action',
            actor: 'EXTERNAL',
            details: 'Pending a verified instruction and confirmation from the relevant bank. This portal has not confirmed a freeze.',
            state: 'PENDING' as const,
          },
          {
            timestamp: new Date(),
            action: 'Recovery outcome',
            actor: 'EXTERNAL',
            details: 'Pending bank and investigation updates.',
            state: 'PENDING' as const,
          },
        ]

        // Build receiver info from available fields
        const receiverInfo = ext.destination_vpa_or_account
          ? ext.destination_vpa_or_account
          : [ext.recipient_name, ext.recipient_phone].filter(Boolean).join(' | ') || 'Unknown'

        const shouldAutoFreeze = ext.golden_hour_active && 
          idaResult.confidence && idaResult.confidence >= 0.8 && 
          ext.fraud_narrative && ext.fraud_narrative.length > 10

        addComplaint({
          id: complaintId,
          ccn: ccn!,
          complainantPhone: ext.user_phone!,
          complainantUserId: complainantUserId || undefined,
          complainantName: '',
          complainantLocation: userLocation,
          fraudNarrative: ext.fraud_narrative || '',
          amount: parseInt(String(ext.amount_stolen).replace(/,/g, '')) || 0,
          receiver: receiverInfo,
          utr: ext.utr_or_transaction_id!,
          paymentPlatform: ext.payment_platform || 'Unknown',
          timestamp: new Date(),
          status: shouldAutoFreeze ? 'SENT_FOR_FREEZING' : 'FILED',
          confidenceScore: idaResult.confidence || 0.7,
          assignedJurisdiction: jurisdiction,
          frozenAccounts: shouldAutoFreeze ? [receiverInfo] : [],
          timeline: workflowTimeline,
          escalatedToAdmin: false,
          isGoldenHour: ext.golden_hour_active,
          goldenHourAutoFrozen: shouldAutoFreeze ? true : undefined,
        })

        savedComplaintId = complaintId

        // Get today's date for complaint filing
        const today = new Date()
        const complaintDate = today.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })

        // Calculate incident date from time_since_fraud_minutes
        const incidentDate = ext.time_since_fraud_minutes
          ? new Date(Date.now() - ext.time_since_fraud_minutes * 60000).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
          : 'Date not specified'

        // Build destination display from available info
        const filedRecipientDisplay = ext.destination_vpa_or_account
          ? ext.destination_vpa_or_account
          : [ext.recipient_name, ext.recipient_phone].filter(Boolean).join(' | ') || 'Unknown'

        const incidentTimeDisplay = formatTimeAgo(ext.time_since_fraud_minutes)

        // Build detailed success response; the client renders the tracking CTA as a real button.
        fileSuccessResponse = `
✅ **Your complaint has been filed successfully!**

🔐 **Cyber Crime Number (CCN):** \`${ccn}\`

📋 **Complaint Summary:**
• **Incident Date:** ${incidentDate} (${incidentTimeDisplay})
• **Complaint Filed:** ${complaintDate}
• **Amount:** ₹${ext.amount_stolen}
• **Destination:** ${filedRecipientDisplay}
• **Transaction ID:** ${ext.utr_or_transaction_id || ext.phonepe_transaction_id}
• **Platform:** ${ext.payment_platform || 'Unknown'}
• **Location:** ${userLocation}
• **Assigned to:** ${jurisdiction} Police Station

**What happens next:**
1. Your complaint will be reviewed by local cyber police
2. You will receive updates via SMS/call on your registered number
3. Keep your CCN safe for future reference

**Stay alert:** Avoid further suspicious communications. If you receive calls demanding money, report them immediately by calling **1930** (24×7 Helpline).
`

        console.log(`[FileComplaint] Complaint ${complaintId} filed with CCN ${ccn}. Freeze decision: ${freezeDecision.action}`)
      } catch (storeErr) {
        console.error('[FileComplaint] Failed to save complaint:', storeErr)
      }
    }

    // Detect if OTP verification is needed (user just provided phone number and not authenticated)
    const userJustProvidedPhone = ext.user_phone && !isUserAuthenticated && message.toLowerCase().match(/\d{10}/)
    const needsOTPVerification = userJustProvidedPhone

    // Offer the confirm / decline / modify buttons whenever every field is collected
    // and we are NOT in the middle of actually filing.
    const confirmActions =
      canFile && !isFilingComplaint
        ? [
            { label: 'Yes, file it', value: 'Yes, file it.' },
            { label: "No, don't file it", value: "No, don't file it." },
            { label: 'Wait, I need to modify some details', value: 'Wait, I need to modify some details before filing.' },
          ]
        : undefined

    return {
      message: isFilingComplaint ? fileSuccessResponse : finalResponse,
      metadata: {
        agent: 'File Complaint',
        priority: route.priority,
        ccn: isFilingComplaint ? ccn : undefined,
        goldenHour: ext.golden_hour_active,
        complaintId: isFilingComplaint ? savedComplaintId : undefined,
        trackComplaint: isFilingComplaint,
        confirmActions,
        // OTP flow metadata
        requiresOTP: needsOTPVerification,
        otpPhone: needsOTPVerification ? ext.user_phone : undefined,
        userAuthenticated: isUserAuthenticated,
        // Persist extracted state for next turn
        extractedState: {
          utr_or_transaction_id: ext.utr_or_transaction_id,
          phonepe_transaction_id: ext.phonepe_transaction_id,
          amount_stolen: ext.amount_stolen,
          destination_vpa_or_account: ext.destination_vpa_or_account,
          recipient_name: ext.recipient_name,
          recipient_phone: ext.recipient_phone,
          fraud_narrative: ext.fraud_narrative,
          payment_platform: ext.payment_platform,
          time_since_fraud_minutes: ext.time_since_fraud_minutes,
          user_phone: ext.user_phone,
          user_location: userLocation,
          golden_hour_active: ext.golden_hour_active,
          narrative_confirmed: narrativeConfirmed,
          classification,
        },
      },
    }
  } catch (error) {
    console.error('[FileComplaint] Error:', error)
    return {
      message: 'Please try again, or call **1930** for immediate human assistance.',
      metadata: {
        agent: 'File Complaint',
        priority: 'NORMAL',
      },
    }
  }
}
