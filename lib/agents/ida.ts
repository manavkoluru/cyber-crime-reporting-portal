import OpenAI from 'openai'

// Helper: Extract previously mentioned transaction details from history
function extractContextFromHistory(history: { role: string; content: string }[]): string {
  const previousDetails: string[] = []

  for (const entry of history) {
    if (entry.role === 'assistant') {
      // Look for patterns like "₹X", "UTR/Transaction ID: ABC", "sent to X@bank", etc.
      const content = entry.content

      if (content.includes('₹') || content.includes('sent to') || content.includes('Transaction ID') || content.includes('UTR')) {
        previousDetails.push(content)
      }
    }
  }

  if (previousDetails.length === 0) return ''

  return `\n## Previously Mentioned in Conversation:\n${previousDetails.join('\n')}\n(If the user is adding to or confirming these details, merge them.)`
}

const IDA_SYSTEM_PROMPT = `You are the Intent Discovery Module (IDA) of the Cyber Crime Reporting Portal – India's AI-powered cyber fraud response system.
CRITICAL: You are the FIRST point of contact. You MUST process ALL images/files.

🔴 IF AN IMAGE IS PROVIDED IN THIS MESSAGE, YOU MUST EXTRACT ALL VISIBLE DATA FROM IT.
DO NOT SKIP IMAGE ANALYSIS. DO NOT SAY YOU CANNOT IDENTIFY DATA IF IT'S VISIBLE.
EVERY NUMBER, VPA, AMOUNT, DATE, NAME, PHONE IN THE IMAGE MUST BE EXTRACTED.

## Current Context (IMPORTANT FOR TIME CALCULATIONS)
Current date/time: ${new Date().toISOString()}

## Your Mission
1. Understand the user's intent (financial fraud or consumer dispute)
2. Extract structured parameters from unstructured input – CONVERSATIONALLY, never using forms
3. Classify intent into exactly one of: FILE_COMPLAINT | CHECK_STATUS | GENERAL_INFO | AMBIGUOUS
4. Identify fraud category: UPI_FRAUD | PHISHING | ECOMMERCE_SCAM | COMMERCIAL_DISPUTE | UNKNOWN

## Image/Screenshot Analysis (PhonePe, Google Pay, ICICI, etc.) - MANDATORY
When an image is provided - YOU MUST extract ALL fields visible:
– Transaction ID / UTR: Look for exact numbers like "770941216078" or text "UTR:", "Ref:", "Transaction ID:", "PhonePe ID:", etc.
– Amount: Extract number with rupee symbol like "₹8400" or amount field
– Recipient Details: Extract ANY of: VPA (name@upi), phone number (+91...), account name, or account number
– Timestamp: Parse date/time from screenshot (e.g., "05:04 pm on 23 Aug 2026") and calculate minutes since fraud
– Sender/Payer: Extract who sent the money (if visible)

CRITICAL RULES FOR TIMESTAMP EXTRACTION:
1. If screenshot shows date/time like "05:04 pm on 23 Aug 2026", parse it exactly
2. Calculate time_since_fraud_minutes by comparing screenshot datetime to current time
3. Do NOT return null for time - always calculate if any timestamp is visible

CRITICAL RULES FOR RECIPIENT EXTRACTION:
1. Extract recipient_name if visible (e.g., "Thejashwini V Gowda", "theju v gowda")
2. Extract recipient_phone if visible (e.g., "+916362139321")
3. Extract destination_vpa_or_account if it's a VPA like "name@upi" or account number
4. If ONLY a name+phone is visible (no VPA), that's still valid - use recipient_name and recipient_phone

CRITICAL RULES FOR ALL EXTRACTION:
1. If you can see the screenshot, EXTRACT ALL VISIBLE NUMBERS AND DATA
2. Do NOT say "I'm unable to identify" if data is visible - extract it
3. Respond with exact values from the screenshot
4. Only ask user to clarify if genuinely unreadable (blurry/cut off)
5. ALWAYS extract from image - this is your primary job

## Parameters to Extract (NEVER hallucinate – only extract what is actually present)
– utr_or_transaction_id: Transaction reference / UTR number (highest priority)
– phonepe_transaction_id: PhonePe-specific transaction ID (if different from UTR)
– amount_stolen: Amount in INR (NUMERIC ONLY, no commas or symbols: "1,97,000" becomes "197000")
– destination_vpa_or_account: Receiver VPA (e.g. scammer@upi) OR account number (optional if phone/name provided)
– recipient_name: Name of the person/entity who received the money
– recipient_phone: Phone number of the recipient (format: +91...)
– payment_platform: GPay | PhonePe | Paytm | NEFT | IMPS | RTGS | Net Banking | Other
– time_since_fraud_minutes: Minutes since fraud occurred (CALCULATE from visible timestamp and current time)
– time_display: Human-friendly format: "2 hours ago" | "1 day ago" | "3 weeks ago" (based on minutes)
– user_phone: User's registered mobile number
– user_location: User's pincode or city (only from what the user has explicitly stated)
– golden_hour_active: true if time_since_fraud_minutes < 120, false otherwise

## Important: Reuse Previously Extracted Data
If the conversation history shows that a field was already extracted in a previous turn (e.g., "I can see ₹X was sent to Y@bank"), reuse that value unless the current message contradicts it. This ensures consistency across the multi-turn conversation.

CRITICAL: Handle Indian number format. If user says "1,97,000" or "₹1,97,000 rupees", extract amount_stolen as "197000" (numeric only).

## Tone & Language Rules
– Warm, empathetic, calming – victims are panicked and distressed
– Hindi/English/Hinglish mix is fully acceptable
– NEVER ask more than ONE clarifying question per message
– If fraud happened < 2 hours ago: show URGENCY (use "⚡" emoji, emphasize speed)
– Never make the user feel blamed or ashamed

## Output Format (MUST return valid JSON)
IMPORTANT: Return ONLY valid JSON object. Do not add any text before or after JSON.
{
  "conversationalReply": "Your full, warm, natural language response to the user",
  "extracted": {
    "intent": "FILE_COMPLAINT|CHECK_STATUS|GENERAL_INFO|AMBIGUOUS",
    "fraud_category": "UPI_FRAUD|PHISHING|ECOMMERCE_SCAM|COMMERCIAL_DISPUTE|UNKNOWN",
    "utr_or_transaction_id": null,
    "phonepe_transaction_id": null,
    "amount_stolen": null,
    "destination_vpa_or_account": null,
    "recipient_name": null,
    "recipient_phone": null,
    "payment_platform": null,
    "time_since_fraud_minutes": null,
    "user_phone": null,
    "user_location": null,
    "golden_hour_active": false
  },
  "confidence": 0.85,
  "missing_critical_fields": ["utr_or_transaction_id", "amount_stolen"]
}
`

export interface IDARaw {
  conversationalReply: string
  extracted?: {
    intent: string
    fraud_category: string
    utr_or_transaction_id?: string | null
    phonepe_transaction_id?: string | null
    amount_stolen?: string | null
    destination_vpa_or_account?: string | null
    recipient_name?: string | null
    recipient_phone?: string | null
    payment_platform?: string | null
    time_since_fraud_minutes?: number | null
    user_phone?: string | null
    user_location?: string | null
    golden_hour_active?: boolean
  }
  confidence?: number
  missing_critical_fields?: string[]
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' } }

export async function runIDA(
  openai: OpenAI,
  message: string,
  history: { role: string; content: string }[],
  fileBase64: string | null,
  fileMediaType: string | null,
  accumulatedExtracted?: IDARaw['extracted']
): Promise<IDARaw> {
  const recentHistory = history.slice(-8).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Extract any transaction details already mentioned in conversation
  // This helps reuse previously extracted data across turns
  const previouslyExtractedContext = extractContextFromHistory(history)

  // Add accumulated extracted data to context
  const accumulatedContext = accumulatedExtracted ? `
## PREVIOUSLY EXTRACTED (Do not override unless user explicitly corrects):
- UTR: ${accumulatedExtracted.utr_or_transaction_id || 'Not yet extracted'}
- Amount: ${accumulatedExtracted.amount_stolen || 'Not yet extracted'}
- VPA/Account: ${accumulatedExtracted.destination_vpa_or_account || 'Not yet extracted'}
- Location: ${accumulatedExtracted.user_location || 'Not yet extracted'}
- Time: ${accumulatedExtracted.time_since_fraud_minutes || 'Not yet calculated'}
- Platform: ${accumulatedExtracted.payment_platform || 'Not yet identified'}

If user provides NEW information, extract and update. Otherwise, PRESERVE previous values.
` : ''

  // Build user content – PRIORITY: Image first, then text
  const userContent: ContentPart[] = []

  // ALWAYS process image if present - this is critical
  if (fileBase64 && fileMediaType?.startsWith('image/')) {
    console.log(`[IDA] 🖼️ PROCESSING IMAGE: ${fileMediaType}, Size: ${fileBase64.length} chars`)
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${fileMediaType};base64,${fileBase64}`,
        detail: 'high', // Moderate detail - balanced quality
      },
    })
  } else if (fileBase64 && fileMediaType === 'application/pdf') {
    console.log('[IDA] Processing PDF')
    userContent.push({
      type: 'text',
      text: '[PDF document attached – please extract any visible transaction details]',
    })
  }

  // Add text message (unless it's just the default upload message)
  if (message && !message.includes('I have uploaded a file for analysis')) {
    userContent.push({ type: 'text', text: message })
  } else if (!fileBase64 && message) {
    // If no file, always include message
    userContent.push({ type: 'text', text: message })
  }

  try {
    const systemPrompt = IDA_SYSTEM_PROMPT + previouslyExtractedContext + accumulatedContext

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        {
          role: 'user',
          content: userContent as any,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1000,
    })

    const raw = response.choices[0].message.content || '{}'
    const parsed = JSON.parse(raw) as IDARaw

    // Sanitize amount: remove commas and convert to string number
    if (parsed.extracted?.amount_stolen) {
      const sanitized = String(parsed.extracted.amount_stolen).replace(/,/g, '').trim()
      parsed.extracted.amount_stolen = sanitized
    }

    // LOG EXTRACTED DATA
    if (parsed.extracted) {
      console.log(`
📊 [IDA EXTRACTION RESULT]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Intent: ${parsed.extracted.intent}
💳 Transaction ID: ${parsed.extracted.utr_or_transaction_id || 'NOT FOUND'}
💰 Amount: ₹${parsed.extracted.amount_stolen || 'NOT FOUND'}
🏦 Destination: ${parsed.extracted.destination_vpa_or_account || 'NOT FOUND'}
📱 Platform: ${parsed.extracted.payment_platform || 'NOT FOUND'}
⏰ Time since fraud: ${parsed.extracted.time_since_fraud_minutes} minutes
🔥 Golden Hour Active: ${parsed.extracted.golden_hour_active ? 'YES' : 'NO'}
📈 Confidence: ${parsed.confidence || 'N/A'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `)
    }

    return parsed
  } catch (err) {
    console.error('[IDA] Parse error:', err)
    return {
      conversationalReply: "I'm here to help you. Could you tell me – what happened and how much was lost?",
      extracted: {
        intent: 'AMBIGUOUS',
        fraud_category: 'UNKNOWN',
        golden_hour_active: false,
      },
      confidence: 0.1,
      missing_critical_fields: ['intent', 'fraud_category'],
    }
  }
}
