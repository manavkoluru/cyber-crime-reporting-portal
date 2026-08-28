/**
 * Builds the user-facing explanation for a confirmed classification.
 *
 * Format:
 *   - 2-4 reassuring plain-language sentences: which category/sub-category this is
 *     (+ a 1930 line when money is already gone)
 *   - then grouped paraphrase + link lines from the KB:
 *       "The laws that apply"        — statute entries (BNS / IT Act / SEBI trading rule)
 *       "Your protections"           — RBI liability & reversal-timeline entries
 *       "Where and how to report"    — SEBI SCORES channel + 1930 / portal-process entries
 *   - never quotes statute; every line is a KB paraphrase with an inline official link
 *
 * All legal text comes from legalKB.ts. This module writes NO legal claims of its own.
 */

import { getLegalReferences, legalKBIsStub } from './legalKB'
import { SUBCATEGORY_LABEL, TOP_LEVEL_CATEGORY } from './types'
import type { FinanceFraudSubCategory, LegalReference } from './types'

const LEAD_IN: Record<FinanceFraudSubCategory, string> = {
  upi_fraud:
    `From what you've described, this is a case of UPI fraud, which falls under the portal's "${TOP_LEVEL_CATEGORY}" category. You did the right thing by reporting it, and there is a clear process for cases like this.`,
  card_fraud:
    `What you've described is debit or credit card fraud, which the portal handles under "${TOP_LEVEL_CATEGORY}". This is a common and well-understood type of complaint, and reporting it quickly is exactly the right step.`,
  internet_banking_fraud:
    `This looks like internet banking fraud, which sits under the portal's "${TOP_LEVEL_CATEGORY}" category. Cases where money is moved out of a bank account online are taken seriously and have a defined path.`,
  vishing:
    `From your account, this is voice phishing (often called vishing), where a caller tricked you into a payment or into sharing details. It is filed under "${TOP_LEVEL_CATEGORY}". Being deceived by a convincing caller is very common, and it is not your fault.`,
  ewallet_theft:
    `This is e-wallet theft, where money was taken from a wallet like Paytm, PhonePe or Amazon Pay. The portal handles it under "${TOP_LEVEL_CATEGORY}". There is a clear complaint route for unauthorised wallet transactions.`,
  demat_fraud:
    `What you've described is demat or trading account fraud, meaning unauthorised activity in your investment account. It falls under the portal's "${TOP_LEVEL_CATEGORY}" category, and both the portal and SEBI have a role in resolving it.`,
  email_takeover:
    `This is an email account takeover that led to a financial loss: someone gained control of your email and used it to cause the fraud. It is filed under "${TOP_LEVEL_CATEGORY}". Securing the email and reporting the loss together is the right approach.`,
}

/** One markdown line: paraphrase + inline citation link. */
function renderLine(ref: LegalReference): string {
  return `- ${ref.paraphrase} ([${ref.instrument}, ${ref.section}](${ref.sourceUrl}))`
}

function renderGroup(heading: string, refs: LegalReference[]): string | null {
  if (refs.length === 0) return null
  return `**${heading}**\n${refs.map(renderLine).join('\n')}`
}

export interface ExplanationOutput {
  explanation: string
  legalReferences: LegalReference[]
  /** True only if the KB has nothing for this sub-category (should not happen with the real KB). */
  legalUnavailable: boolean
}

export function buildExplanation(
  subCategory: FinanceFraudSubCategory,
  opts: { timeCritical?: boolean } = {}
): ExplanationOutput {
  const refs = getLegalReferences(subCategory)

  // Reassuring lead-in (spec: 2-4 sentences).
  const lead: string[] = [LEAD_IN[subCategory]]
  if (opts.timeCritical) {
    lead.push(
      `Because money has already left your account, the most useful thing right now is to call the national cybercrime helpline on **1930**. The sooner a transaction is flagged, the better the chance of a freeze.`
    )
  }
  const leadIn = lead.join('\n\n')

  if (legalKBIsStub(subCategory)) {
    return { explanation: leadIn, legalReferences: refs, legalUnavailable: true }
  }

  // Group by kind. 'statute' -> laws; 'protection' -> RBI rights; 'channel'+'process' -> where/how to report.
  const statutes = refs.filter((r) => r.kind === 'statute')
  const protections = refs.filter((r) => r.kind === 'protection')
  const reporting = refs.filter((r) => r.kind === 'channel' || r.kind === 'process')

  const groups = [
    renderGroup('The laws that apply', statutes),
    renderGroup('Your protections', protections),
    renderGroup('Where and how to report', reporting),
  ].filter((g): g is string => g !== null)

  return {
    explanation: [leadIn, ...groups].join('\n\n'),
    legalReferences: refs,
    legalUnavailable: false,
  }
}

/**
 * A compact 2-3 sentence preamble for the FIRST file-complaint reply: names the
 * sub-category and the 1-2 most relevant statute sections with inline links, so the
 * user knows what the complaint is being filed on before the agent asks for details.
 * Not the full grouped explanation — that stays in `buildExplanation`.
 */
export function buildClassificationPreamble(
  subCategory: FinanceFraudSubCategory
): string {
  const label = SUBCATEGORY_LABEL[subCategory]
  const tier1 = getLegalReferences(subCategory).filter(
    (r) => r.kind === 'statute' && r.tier === 1
  )

  // Prefer breadth: one BNS + one IT Act section when both are available.
  const bns = tier1.find((r) => r.instrument.startsWith('Bharatiya'))
  const ita = tier1.find((r) => r.instrument.startsWith('Information Technology'))
  const picks = [bns, ita].filter((r): r is LegalReference => Boolean(r))
  const statutes = picks.length > 0 ? picks : tier1.slice(0, 2)

  const lawBit =
    statutes.length > 0
      ? ` This is typically dealt with under ${statutes
          .map((r) => `[${shortCite(r)}](${r.sourceUrl})`)
          .join(' and ')}.`
      : ''

  return `I'm recording this as **${label}**, under the "${TOP_LEVEL_CATEGORY}" category.${lawBit}`
}

/** Short human descriptor per KB chunk, for the inline citation. */
const SHORT_DESCRIPTOR: Record<string, string> = {
  bns_318: 'cheating',
  bns_319: 'cheating by personation',
  bns_316: 'criminal breach of trust',
  bns_336: 'forgery',
  it_act_66c: 'identity theft',
  it_act_66d: 'cheating by personation via computer',
  it_act_43: 'unauthorised access',
}

/** "BNS 2023 s.318 (cheating)" style short citation for inline use. */
function shortCite(r: LegalReference): string {
  const instrument = r.instrument
    .replace('Bharatiya Nyaya Sanhita, 2023', 'BNS 2023')
    .replace('Information Technology Act, 2000', 'IT Act 2000')
    .replace(/^SEBI Circular.*/, 'SEBI circular')
    .replace(/^RBI Circular.*/, 'RBI circular')
  const num = r.section.replace(/^Section\s+/, 's.')
  const descriptor = SHORT_DESCRIPTOR[r.id]
  return descriptor ? `${instrument} ${num} (${descriptor})` : `${instrument} ${num}`
}
