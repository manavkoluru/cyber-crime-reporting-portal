import OpenAI from 'openai'
import { IDARaw } from './ida'
import { RouteDecision } from './router'
import { addComplaint, getPincodeJurisdiction } from '@/lib/store'
import { decideFreezeAction } from '@/lib/freezeDecision'
import { formatTimeAgo } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

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
  phoneFromSession?: string | null // Phone number from OTP login session
): Promise<{ message: string; metadata: Record<string, unknown> }> {
  // Merge previous extracted data with current (current takes precedence)
  let ext = { ...previousExtracted, ...idaResult.extracted }

  // Pre-fill phone from session if user logged in via OTP
  if (phoneFromSession && !ext.user_phone) {
    ext = { ...ext, user_phone: phoneFromSession }
    console.log(`[FileComplaint] Pre-filled phone from OTP session: ${phoneFromSession}`)
  }

  // Check if user is authenticated (has phone from session)
  const isUserAuthenticated = !!phoneFromSession

  // Check if we have all mandatory fields to file
  const hasDestinationInfo = !!(ext.destination_vpa_or_account || ext.recipient_phone || ext.recipient_name)
  const canFile = !!(
    ext.utr_or_transaction_id &&
    ext.amount_stolen &&
    hasDestinationInfo &&
    ext.time_since_fraud_minutes !== null &&
    ext.user_phone &&
    userLocation &&
    ext.fraud_narrative &&
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
  if (!ext.fraud_narrative) missingFields.push('NARRATIVE')
  // Only ask for phone if not already provided AND not already asked in this conversation
  if (!ext.user_phone && !recentConversation.includes('phone number')) {
    missingFields.push('PHONE')
  }

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

  const nextTaskInstructions = missingFields.length === 0
    ? 'TASK: Show summary of complaint details. Ask for confirmation: "Should I file your complaint with these details?" Do NOT ask for additional fields.'
    : `TASK: Ask for the FIRST missing field ONLY: ${missingFieldLabels[nextMissingField as keyof typeof missingFieldLabels]}. Do NOT ask for multiple fields.`

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
    })

    const responseText = response.choices[0].message.content || 'Please try again.'
    const asksForOtp = /\botp\b|verification code|4\s*[-–]\s*6\s*digit|enter.*code/i.test(responseText)
    // Guard against an LLM re-asking for a credential that the session has already verified.
    const safeResponseText = isUserAuthenticated && asksForOtp ? authenticatedNextStep : responseText

    // Prepend summary if image was processed
    const finalResponse = summaryResponse ? summaryResponse + safeResponseText : safeResponseText

    // Check if user confirmed filing (look for affirmative responses)
    const userConfirmedFiling = /\b(yes|sure|go ahead|proceed|file|submit|confirm)\b/i.test(message)
    const isFilingComplaint = userConfirmedFiling && canFile && userLocation

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

    return {
      message: isFilingComplaint ? fileSuccessResponse : finalResponse,
      metadata: {
        agent: 'File Complaint',
        priority: route.priority,
        ccn: isFilingComplaint ? ccn : undefined,
        goldenHour: ext.golden_hour_active,
        complaintId: isFilingComplaint ? savedComplaintId : undefined,
        trackComplaint: isFilingComplaint,
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
