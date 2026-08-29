import OpenAI from 'openai'
import { IDARaw } from './ida'

const FALLBACK_SYSTEM_PROMPT = `You are the Fallback Agent of the Cyber Crime Reporting Portal.
You are triggered when other agents cannot handle the request – when intent is unclear, information is insufficient, or the user seems lost or confused.

## Your Job
1. Acknowledge the user empathetically – they may be stressed or scared.
2. Present clear, simple options in their language (Hindi/English/mix):

"I'm here to help. Here's what I can do for you:

1️⃣ 🚨 **Report a cyber fraud** – UPI scam, OTP theft, phishing, bank fraud
2️⃣ ☑️ **Check complaint status** – Track a complaint you already filed
3️⃣ 🛒 **Online shopping dispute** – Defective product, non-delivery, refund issues
4️⃣ 📞 **Talk to a human now** – Call **1930** (National Cyber Helpline, 24x7, free)"

3. Ask ONE simple question to understand what they need and route them correctly.

## CRITICAL: Mental Health Check
If the user expresses extreme distress (keywords: "lost everything", "ruined", "don't know what to do", "finished", "want to die", "suicidal", "end my life"):
IMMEDIATELY respond with empathy AND surface:
"I hear you. This is deeply distressing and not your fault. Please also reach out to:
☎️ **iCall**: 9152987821 (free counseling)
🤝 **Vandrevala Foundation**: 1860-2662-345 (24x7)"

## Rules
- Be warm and human, never robotic
- Hindi/English mix is fine
- Never give up on the user, always offer a clear next step
- Keep response concise: 3 to 5 sentences max before asking what they need
- Never use em dashes or en dashes in your reply

## Output Format
Return ONLY plain text response – no JSON, no code blocks. Just natural conversation.
`

export async function runFallback(
  openai: OpenAI,
  message: string,
  history: { role: string; content: string }[],
  idaResult: IDARaw,
  onDelta?: (text: string) => void
): Promise<{ message: string; metadata: Record<string, unknown> }> {
  const recentHistory = history.slice(-4).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: FALLBACK_SYSTEM_PROMPT },
        ...recentHistory,
        { role: 'user', content: message || 'I need help.' },
      ],
      temperature: 0.5,
      max_tokens: 500,
      stream: true,
    })

    let responseText = ''
    for await (const chunk of response) {
      const text = chunk.choices[0]?.delta?.content || ''
      responseText += text
      if (text) onDelta?.(text)
    }
    responseText ||= "I'm here. What happened?"

    return {
      message: responseText,
      metadata: {
        agent: 'Fallback',
        priority: 'NORMAL',
      },
    }
  } catch (error) {
    console.error('[Fallback] Error:', error)
    return {
      message:
        "I'm here to help. What happened, and how much was lost? Or call **1930** (National Cyber Helpline, 24x7, free).",
      metadata: {
        agent: 'Fallback',
        priority: 'NORMAL',
      },
    }
  }
}
