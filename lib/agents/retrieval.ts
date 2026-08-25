import OpenAI from 'openai'
import { IDARaw } from './ida'
import { getComplaintsByPhone, ComplaintData } from '@/lib/store'

const STATUS_LABELS: Record<ComplaintData['status'], string> = {
  FILED: '📋 Filed',
  PENDING_CLARIFICATION: '⏳ Pending Clarification',
  UNDER_INVESTIGATION: '🔍 Under Investigation',
  ACCOUNT_FROZEN: '💰 Funds Frozen',
  RESOLVED: '✅ Resolved',
}

function maskPhone(phone: string): string {
  return phone.length >= 4 ? `XXXXXX${phone.slice(-4)}` : phone
}

function formatComplaintList(complaints: ComplaintData[]): string {
  return complaints
    .map((c, i) => {
      const date = new Date(c.timestamp).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      return `${i + 1}️⃣ ☑️ [${c.ccn}] | ₹${c.amount.toLocaleString('en-IN')} | ${c.paymentPlatform} | Filed: ${date} | Status: ${STATUS_LABELS[c.status]}`
    })
    .join('\n')
}

function formatComplaintDetail(c: ComplaintData): string {
  const date = new Date(c.timestamp).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `
🔐 CCN: ${c.ccn}
💰 Amount: ₹${c.amount.toLocaleString('en-IN')}
🏦 Sent to: ${c.receiver}
💳 Transaction ID: ${c.utr}
📱 Platform: ${c.paymentPlatform}
📅 Filed on: ${date}
📍 Jurisdiction: ${c.assignedJurisdiction} Police Station
📊 Status: ${STATUS_LABELS[c.status]}
${c.frozenAccounts.length > 0 ? `🧊 Frozen Accounts: ${c.frozenAccounts.join(', ')}` : ''}
`.trim()
}

const RETRIEVAL_SYSTEM_PROMPT = (phoneFromSession?: string, complaintsContext?: string) => `You are the Retrieval Agent of the Cyber Crime Reporting Portal.
Your job: Help users check status of their previously filed complaints – securely and clearly.

${phoneFromSession ? `## USER STATUS
✅ You are logged in with phone: +91${phoneFromSession}
Skip Step 1-2 - go directly to Step 3 to retrieve complaints for this phone number.` : ''}

## Workflow
Step 1: ${phoneFromSession ? '(SKIPPED - User authenticated)' : 'Ask for registered phone number (if not provided).'}
Step 2: ${phoneFromSession ? '(SKIPPED - User authenticated)' : 'Trigger OTP verification: "I have sent an OTP to XXXXXX[last 2 digits]. Please enter the 4-6 digit code to verify."'}
Step 3: Accept any 4-6 digit number as a valid OTP (simulated for hackathon).
Step 4: Present the complaints listed below EXACTLY as given – do NOT invent, alter, or add any complaints, amounts, statuses, or CCNs that are not in this list.

${complaintsContext || '## REAL COMPLAINT DATA\nNo complaint lookup has been performed yet, or none was found for this phone number. If asked to list complaints, say none were found and offer to file a new one.'}

Then ask: "Please select the complaint you want to view by entering its NUMBER (1, 2, 3, etc.)"

## Rules
– CRITICAL: Only use the REAL COMPLAINT DATA provided above. NEVER fabricate CCNs, amounts, dates, or statuses.
– Mask sensitive data: show only last 4 digits of account numbers, phone as XXXXXX78
– When listing complaints: Use numbers (1, 2, 3, 4) – make this CRYSTAL CLEAR in your prompt
– Do NOT ask for CCN number when selecting complaints – ask for the list NUMBER (1-4)
– If "no complaints found" – offer to file a new one, do not invent any

## Tone
Warm, reassuring. Victims are worried. Never stress them out with delays.

## Output Format
Return ONLY plain text response – no JSON, no code blocks. Just natural conversation.
`

export async function runRetrieval(
  openai: OpenAI,
  message: string,
  history: { role: string; content: string }[],
  idaResult: IDARaw,
  phoneFromSession?: string | null // Phone number from OTP login session
): Promise<{ message: string; metadata: Record<string, unknown> }> {
  const recentHistory = history.slice(-8).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  // Only look up real complaints once we know the user's phone (session, or
  // extracted from an OTP-verified message earlier in this conversation).
  const lookupPhone = phoneFromSession || idaResult.extracted?.user_phone || null

  let complaintsContext: string | undefined
  let complaints: ComplaintData[] = []
  if (lookupPhone) {
    complaints = getComplaintsByPhone(lookupPhone)
    complaintsContext = complaints.length > 0
      ? `## REAL COMPLAINT DATA (phone ${maskPhone(lookupPhone)}) – present these EXACTLY, do not modify:\n${formatComplaintList(complaints)}\n\n## FULL DETAILS (use when user selects a numbered complaint):\n${complaints.map((c, i) => `--- Complaint ${i + 1} ---\n${formatComplaintDetail(c)}`).join('\n\n')}`
      : `## REAL COMPLAINT DATA (phone ${maskPhone(lookupPhone)})\nNo complaints found for this phone number. Tell the user clearly and offer to help file a new one.`
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: RETRIEVAL_SYSTEM_PROMPT(phoneFromSession || undefined, complaintsContext) },
        ...recentHistory,
        { role: 'user', content: message },
      ],
      temperature: 0.4,
      max_tokens: 700,
    })

    const responseText = response.choices[0].message.content || 'Please try again.'

    return {
      message: responseText,
      metadata: {
        agent: 'Retrieval',
        priority: 'NORMAL',
        complaintsFound: complaints.length,
      },
    }
  } catch (error) {
    console.error('[Retrieval] Error:', error)
    return {
      message: 'Please try again, or call **1930** for immediate human assistance.',
      metadata: {
        agent: 'Retrieval',
        priority: 'NORMAL',
      },
    }
  }
}
