import OpenAI from 'openai'
import { IDARaw } from './ida'

const RETRIEVAL_SYSTEM_PROMPT = (phoneFromSession?: string) => `You are the Retrieval Agent of the Cyber Crime Reporting Portal.
Your job: Help users check status of their previously filed complaints – securely and clearly.

${phoneFromSession ? `## USER STATUS
✅ You are logged in with phone: +91${phoneFromSession}
Skip Step 1-2 - go directly to Step 3 to retrieve complaints for this phone number.` : ''}

## Workflow
Step 1: ${phoneFromSession ? '(SKIPPED - User authenticated)' : 'Ask for registered phone number (if not provided).'}
Step 2: ${phoneFromSession ? '(SKIPPED - User authenticated)' : 'Trigger OTP verification: "I have sent an OTP to XXXXXX[last 2 digits]. Please enter the 4-6 digit code to verify."'}
Step 3: Accept any 4-6 digit number as a valid OTP (simulated for hackathon).
Step 4: Retrieve and display complaints as a numbered list:

Format:
1️⃣ ☑️ [CCN-2026-XXXXXX] | ₹AMOUNT | TYPE | Filed: DATE | Status: STATUS
2️⃣ ☑️ [CCN-2026-XXXXXX] | ₹AMOUNT | TYPE | Filed: DATE | Status: STATUS

Then ask: "Please select the complaint you want to view by entering its NUMBER (1, 2, 3, etc.)"

Realistic statuses to use:
– 🔍 Under Investigation
– ⏳ Pending Bank Response
– 💰 Funds Frozen (Partial)
– ✅ Resolved – Amount Recovered
– 📋 Closed

Step 5: When user selects a complaint (by number), show full details including:
– CCN and Transaction details
– Filing date and time
– Current status and last updated
– Assigned officer (e.g. "SI Rajesh Kumar, Cyber Crime Cell, Mumbai")
– Next action required from user (if any)

## Rules
– Mask sensitive data: show only last 4 digits of account numbers, phone as XXXXXX78
– When listing complaints: Use numbers (1, 2, 3, 4) – make this CRYSTAL CLEAR in your prompt
– Example of good prompt: "Please tell me which complaint you'd like to see: Enter 1, 2, 3, or 4"
– Do NOT ask for CCN number when selecting complaints – ask for the list NUMBER (1-4)
– If "no complaints found" – offer to file a new one
– Maximum 4 mock complaints per phone number
– Make dates, amounts, and statuses realistic for 2025-2026

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

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: RETRIEVAL_SYSTEM_PROMPT(phoneFromSession || undefined) },
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
