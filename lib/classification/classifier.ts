/**
 * Complaint classification module — SCOPE: classify only. Does NOT file.
 *
 * Given free-text user input (optionally plus a clarifying answer to a prior question),
 * this:
 *   1. classifies into one of 7 Online Financial Fraud sub-categories, OR
 *      flags a single clarifying question, OR routes to a fallback category
 *   2. detects time-criticality (money already lost)
 *   3. builds the user-facing legal explanation (from the approved KB via explain.ts)
 *   4. attaches the field-requirements file for the confirmed sub-category
 *
 * The LLM is used ONLY for the category decision. Legal text, field lists, and the
 * explanation structure are deterministic and come from local data files.
 */

import OpenAI from 'openai'
import {
  FINANCE_FRAUD_SUBCATEGORIES,
  OVERLAP_AREAS,
  OVERLAP_LABEL,
  SUBCATEGORY_LABEL,
  TOP_LEVEL_CATEGORY,
} from './types'
import type {
  ClassificationOverlap,
  ClassificationResult,
  FallbackCategory,
  FinanceFraudSubCategory,
  OverlapArea,
} from './types'
import { buildExplanation } from './explain'
import { getFieldFileForFiling } from './fieldRequirements'
import { mapDetailsToChecklist } from './mapDetails'
import type { LooseDetails } from './mapDetails'

const FALLBACK_CATEGORIES: FallbackCategory[] = [
  'NOT_FINANCIAL_FRAUD',
  'DATA_BREACH_NO_LOSS',
  'OTHER_CYBERCRIME',
  'UNCLASSIFIABLE',
]

const SUBCATEGORY_HINTS: Record<FinanceFraudSubCategory, string> = {
  upi_fraud:
    'Money moved via a UPI app (GPay, PhonePe, Paytm UPI, BHIM, bank UPI). Mentions VPA/UPI ID, "@upi", "@okaxis", collect request, scan-and-pay, UTR/RRN.',
  card_fraud:
    'A debit or credit card was charged without authorisation. Mentions card number/last 4, CVV, OTP for a card txn, POS/online merchant charge, international charge, chargeback.',
  internet_banking_fraud:
    'Funds transferred out of a bank account through net banking / mobile banking using NEFT/IMPS/RTGS to a beneficiary account+IFSC. Often after phishing of net-banking credentials.',
  vishing:
    'A phone CALL where the fraudster impersonated a bank/KYC/police/delivery agent and talked the victim into paying or sharing OTP/PIN/CVV or installing a screen-share app. The call is the defining feature; the payment channel is secondary.',
  ewallet_theft:
    'Money taken from a prepaid wallet balance (Paytm Wallet, PhonePe Wallet, Amazon Pay, Mobikwik). Often via OTP sharing, SIM swap, or lost/unlocked device.',
  demat_fraud:
    'Unauthorised activity in a demat/trading/investment account: rogue trades, holdings transferred out, funds withdrawn from the trading account. Mentions broker, client ID, DP ID, contract notes, CDSL/NSDL.',
  email_takeover:
    'The victim LOST CONTROL of their email account, and that takeover caused a financial loss (attacker reset a bank password, intercepted OTPs, redirected an invoice). Email compromise is the root cause, financial loss is the consequence.',
}

interface ClassifierRawOutput {
  decision: 'SUBCATEGORY' | 'CLARIFY' | 'FALLBACK'
  subCategory?: string
  candidateSubCategories?: string[]
  clarifyingQuestion?: string
  fallbackCategory?: string
  confidence?: number
  moneyAlreadyLost?: boolean
  overlaps?: Array<{ area?: string; note?: string; urgent?: boolean }>
  reasoning?: string
}

/** Coerce the model's raw `overlaps` into typed, deduped, capped ClassificationOverlap[]. */
function parseOverlaps(raw: ClassifierRawOutput['overlaps']): ClassificationOverlap[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<OverlapArea>()
  const out: ClassificationOverlap[] = []
  for (const o of raw) {
    if (!o || typeof o !== 'object') continue
    const upper = typeof o.area === 'string' ? o.area.toUpperCase() : ''
    const area: OverlapArea = (OVERLAP_AREAS as string[]).includes(upper)
      ? (upper as OverlapArea)
      : 'OTHER_CYBERCRIME'
    if (seen.has(area)) continue
    seen.add(area)
    out.push({
      area,
      label: OVERLAP_LABEL[area],
      note: typeof o.note === 'string' && o.note.trim() ? o.note.trim() : '',
      urgent: o.urgent === true,
    })
    if (out.length >= 3) break
  }
  return out
}

function buildSystemPrompt(): string {
  const subcatBlock = FINANCE_FRAUD_SUBCATEGORIES.map(
    (k) => `- ${k} (${SUBCATEGORY_LABEL[k]}): ${SUBCATEGORY_HINTS[k]}`
  ).join('\n')

  return `You classify a citizen's free-text description of a suspected CYBER-ENABLED FINANCIAL FRAUD in India.

All valid categories nest under the portal's top-level "${TOP_LEVEL_CATEGORY}" category.
The 7 sub-categories:
${subcatBlock}

RULES:
1. Pick exactly ONE sub-category when the description clearly fits one.
2. If the description is genuinely ambiguous between exactly TWO sub-categories, do NOT guess:
   return decision "CLARIFY" with those two candidates and ONE short clarifying question
   that would resolve it (e.g. "Was the money taken through a UPI app, or was your card charged directly?").
3. If it does NOT fit any of the 7 finance sub-categories (harassment, stalking, sextortion,
   a data breach with no money lost, fake news, hacking with no financial loss, etc.),
   return decision "FALLBACK" and choose a fallbackCategory from:
   NOT_FINANCIAL_FRAUD | DATA_BREACH_NO_LOSS | OTHER_CYBERCRIME | UNCLASSIFIABLE
4. Set moneyAlreadyLost = true ONLY if the user indicates money has actually left their
   account/card/wallet already (not merely "almost", "they tried", or "I clicked a link").
5. "vishing" vs the payment sub-categories: if a deceptive phone CALL is the core of the story,
   choose "vishing" even though a UPI/card/bank payment also happened.
6. "email_takeover" requires BOTH loss of control of the email AND a resulting financial loss.
   If only the email was hacked with no money lost, that's FALLBACK / DATA_BREACH_NO_LOSS.
7. confidence is 0..1 for your top decision.
8. OVERLAPS — SEPARATE from the primary decision above. Pick the best FINANCIAL sub-category
   as the primary decision regardless. THEN, if the description ALSO involves a non-financial
   cybercrime, list each under "overlaps". Overlaps DO NOT change the primary decision.
   Choose the MOST SPECIFIC area; use OTHER_CYBERCRIME only when none of the specific ones fit:
   - CYBER_HARASSMENT: online abuse, sextortion, threats or blackmail (e.g. "pay or I leak your
     photos"), intimidation, obscene messages.
   - WOMEN_AND_CHILDREN: anything involving a minor, or content/threats sexual in nature
     targeting a woman or girl. If a victim is a child, ALSO set urgent.
   - STALKING_DEFAMATION: persistent unwanted contact/tracking, or false damaging content posted
     about the person.
   - DATA_BREACH: personal data, accounts, or documents were exposed/stolen and the exposure is
     still unresolved.
   - OTHER_CYBERCRIME: a non-financial cybercrime that fits none of the above.
   Set "urgent": true for an overlap that is ongoing, a live threat, or involves a child.
   If there is no non-financial angle, return "overlaps": [].

Respond with STRICT JSON only:
{
  "decision": "SUBCATEGORY" | "CLARIFY" | "FALLBACK",
  "subCategory": "<one of the 7 keys>",            // when decision=SUBCATEGORY
  "candidateSubCategories": ["<key>", "<key>"],     // when decision=CLARIFY (exactly 2)
  "clarifyingQuestion": "<one question>",           // when decision=CLARIFY
  "fallbackCategory": "<one fallback key>",         // when decision=FALLBACK
  "confidence": <number 0..1>,
  "moneyAlreadyLost": <boolean>,
  "overlaps": [ { "area": "<overlap area>", "note": "<one plain sentence>", "urgent": <boolean> } ],
  "reasoning": "<one short sentence>"
}`
}

function coerceSubCategory(v: unknown): FinanceFraudSubCategory | null {
  return typeof v === 'string' &&
    (FINANCE_FRAUD_SUBCATEGORIES as string[]).includes(v)
    ? (v as FinanceFraudSubCategory)
    : null
}

function coerceFallback(v: unknown): FallbackCategory {
  return typeof v === 'string' && (FALLBACK_CATEGORIES as string[]).includes(v)
    ? (v as FallbackCategory)
    : 'UNCLASSIFIABLE'
}

function clamp01(n: unknown): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? n : 0.5
  return Math.min(1, Math.max(0, x))
}

/** Cheap lexical hint that money is already gone — used to OR with the model's flag. */
function looksTimeCritical(text: string): boolean {
  return /\b(lost|debited|deducted|gone|withdrawn|transferred out|stolen|took (?:my|the) money|₹?\s?\d[\d,]*\s*(?:was|got)\s*(?:debited|deducted|taken))\b/i.test(
    text
  )
}

export interface ClassifyInput {
  /** The user's description of what happened. */
  text: string
  /**
   * If the previous turn returned NEEDS_CLARIFICATION, pass the original text plus
   * the user's answer here (concatenated or as a short combined string), and pass the
   * candidate list so the model is nudged to resolve within it.
   */
  priorCandidates?: FinanceFraudSubCategory[]
  /**
   * Everything the conversation has ALREADY surfaced — free-flow chat details plus
   * whatever the chat's image/PDF recognition (IDA) extracted. Loosely keyed: our own
   * checklist keys, IDA keys, or anything else. The classifier maps these onto the
   * checklist for the confirmed sub-category (see result.mappedFields). Nothing here
   * is required; it only prevents re-asking for what we already know.
   */
  knownDetails?: LooseDetails
}

export async function runClassifier(
  openai: OpenAI,
  input: ClassifyInput
): Promise<ClassificationResult> {
  const userText = (input.text || '').trim()

  if (!userText) {
    return {
      status: 'FALLBACK',
      fallbackCategory: 'UNCLASSIFIABLE',
      confidence: 0,
      time_critical: false,
      overlaps: [],
      overlapUrgent: false,
      explanation:
        "I couldn't tell what happened from that. Could you describe, in a sentence or two, how the money was lost or what the fraudster did?",
      legalReferences: [],
    }
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt() },
  ]
  if (input.priorCandidates?.length) {
    messages.push({
      role: 'system',
      content: `The user was already asked to choose between: ${input.priorCandidates
        .map((c) => `${c} (${SUBCATEGORY_LABEL[c]})`)
        .join(
          ' / '
        )}. Their reply is included below — resolve to one of those two unless the reply clearly points elsewhere.`,
    })
  }
  messages.push({ role: 'user', content: userText })

  let raw: ClassifierRawOutput
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 600,
    })
    raw = JSON.parse(response.choices[0].message.content || '{}') as ClassifierRawOutput
  } catch (err) {
    console.error('[Classifier] LLM classification failed:', err)
    const tc = looksTimeCritical(userText)
    return {
      status: 'FALLBACK',
      fallbackCategory: 'UNCLASSIFIABLE',
      confidence: 0,
      time_critical: tc,
      overlaps: [],
      overlapUrgent: tc,
      explanation:
        "I couldn't classify this automatically just now. You can still proceed, or call **1930** if money has already been lost.",
      legalReferences: [],
    }
  }

  const timeCritical = Boolean(raw.moneyAlreadyLost) || looksTimeCritical(userText)
  const confidence = clamp01(raw.confidence)
  const overlaps = parseOverlaps(raw.overlaps)
  const overlapUrgent = timeCritical || overlaps.some((o) => o.urgent)

  // — CLARIFY
  if (raw.decision === 'CLARIFY') {
    const candidates = (raw.candidateSubCategories || [])
      .map(coerceSubCategory)
      .filter((c): c is FinanceFraudSubCategory => c !== null)
      .slice(0, 2)

    if (candidates.length === 2 && raw.clarifyingQuestion) {
      return {
        status: 'NEEDS_CLARIFICATION',
        confidence,
        clarifyingQuestion: raw.clarifyingQuestion.trim(),
        candidateSubCategories: candidates,
        time_critical: timeCritical,
        overlaps,
        overlapUrgent,
        explanation: '',
        legalReferences: [],
      }
    }
    // Malformed CLARIFY — fall through to fallback rather than guess.
  }

  // — FALLBACK
  if (raw.decision === 'FALLBACK' || raw.decision === 'CLARIFY') {
    const fallbackCategory =
      raw.decision === 'FALLBACK' ? coerceFallback(raw.fallbackCategory) : 'UNCLASSIFIABLE'
    return {
      status: 'FALLBACK',
      fallbackCategory,
      confidence: raw.decision === 'FALLBACK' ? confidence : 0.3,
      time_critical: timeCritical,
      overlaps,
      overlapUrgent,
      explanation: fallbackExplanation(fallbackCategory),
      legalReferences: [],
    }
  }

  // — SUBCATEGORY
  const subCategory = coerceSubCategory(raw.subCategory)
  if (!subCategory) {
    return {
      status: 'FALLBACK',
      fallbackCategory: 'UNCLASSIFIABLE',
      confidence: 0.2,
      time_critical: timeCritical,
      overlaps,
      overlapUrgent,
      explanation: fallbackExplanation('UNCLASSIFIABLE'),
      legalReferences: [],
    }
  }

  const { explanation, legalReferences } = buildExplanation(subCategory, {
    timeCritical,
  })

  const mappedFields = input.knownDetails
    ? mapDetailsToChecklist(subCategory, input.knownDetails, { timeCritical })
    : undefined

  return {
    status: 'CLASSIFIED',
    topLevelCategory: TOP_LEVEL_CATEGORY,
    subCategory,
    confidence,
    time_critical: timeCritical,
    overlaps,
    overlapUrgent,
    explanation,
    legalReferences,
    fieldFile: getFieldFileForFiling(subCategory),
    mappedFields,
  }
}

function fallbackExplanation(category: FallbackCategory): string {
  switch (category) {
    case 'NOT_FINANCIAL_FRAUD':
      return "What you've described doesn't look like a financial-fraud case, so I won't slot it into that flow. It still sounds like something the cybercrime portal can help with; it should go through a different complaint category, and a person can guide you from there."
    case 'DATA_BREACH_NO_LOSS':
      return 'This sounds like your data or an account was exposed, but without money being lost. That is worth reporting, but it belongs under a different category from financial fraud, and the steps to secure your accounts come first.'
    case 'OTHER_CYBERCRIME':
      return "This looks like a cybercrime, but not one of the financial-fraud types this step handles. I'll flag it so it's routed to the right category instead of being forced into the wrong one."
    case 'UNCLASSIFIABLE':
    default:
      return "I couldn't confidently match this to a financial-fraud category from what you've told me. A few more details about how the money was lost would help, or you can ask to speak to a person."
  }
}
