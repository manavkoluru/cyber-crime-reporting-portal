/**
 * Offline tests for buildExplanation — no OpenAI, no network.
 *   npm run classify:test
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { buildExplanation } from '../explain'
import { FINANCE_FRAUD_SUBCATEGORIES } from '../types'

/** The reassuring lead-in is everything before the first "**Heading**" group. */
function leadInSentenceCount(explanation: string): number {
  const leadIn = explanation.split(/\n\n\*\*/)[0]
  const matches = leadIn.match(/[.!?](\s|$)/g)
  return matches ? matches.length : 0
}

const KEYWORD: Record<string, RegExp> = {
  upi_fraud: /\bupi\b/i,
  card_fraud: /\bcard\b/i,
  internet_banking_fraud: /internet banking|net ?banking/i,
  vishing: /vishing|phone call|voice phishing/i,
  ewallet_theft: /wallet/i,
  demat_fraud: /demat|trading/i,
  email_takeover: /email account takeover|email/i,
}

for (const sub of FINANCE_FRAUD_SUBCATEGORIES) {
  test(`buildExplanation(${sub}): 2-4 lead-in sentences, names the sub-category`, () => {
    const out = buildExplanation(sub)
    const count = leadInSentenceCount(out.explanation)
    assert.ok(count >= 2 && count <= 4, `lead-in had ${count} sentences: ${out.explanation}`)
    assert.match(out.explanation, KEYWORD[sub])
  })

  test(`buildExplanation(${sub}): KB resolves, every line has a paraphrase + link`, () => {
    const out = buildExplanation(sub)
    assert.equal(out.legalUnavailable, false)
    assert.ok(out.legalReferences.length > 0)
    // every rendered bullet ends with a markdown link
    for (const line of out.explanation.split('\n').filter((l) => l.startsWith('- '))) {
      assert.match(line, /\(\[[^\]]+\]\(https?:\/\/[^)]+\)\)\s*$/, `no citation link: ${line}`)
    }
  })
}

test('banking sub-categories surface the "Your protections" (RBI) group', () => {
  for (const sub of ['upi_fraud', 'card_fraud', 'internet_banking_fraud', 'ewallet_theft'] as const) {
    const out = buildExplanation(sub)
    assert.match(out.explanation, /\*\*Your protections\*\*/)
    assert.match(out.explanation, /rbi\.org\.in/)
  }
})

test('demat_fraud surfaces SEBI SCORES under "Where and how to report"', () => {
  const out = buildExplanation('demat_fraud')
  assert.match(out.explanation, /\*\*Where and how to report\*\*/)
  assert.match(out.explanation, /scores\.sebi\.gov\.in/)
  // no RBI protections group for demat
  assert.ok(!out.explanation.includes('**Your protections**'))
})

test('vishing has no RBI protections group but keeps the 1930 process line', () => {
  const out = buildExplanation('vishing')
  assert.ok(!out.explanation.includes('**Your protections**'))
  assert.match(out.explanation, /\*\*Where and how to report\*\*/)
  assert.match(out.explanation, /cybercrime\.gov\.in/)
})

test('timeCritical injects the 1930 helpline sentence into the lead-in', () => {
  const plain = buildExplanation('upi_fraud')
  const urgent = buildExplanation('upi_fraud', { timeCritical: true })
  assert.ok(!plain.explanation.split('\n\n**')[0].includes('1930'))
  assert.ok(urgent.explanation.split('\n\n**')[0].includes('1930'))
})

test('legalReferences carry tier and kind for the filing module', () => {
  const out = buildExplanation('demat_fraud')
  for (const r of out.legalReferences) {
    assert.ok([1, 2, 3].includes(r.tier))
    assert.ok(['statute', 'protection', 'channel', 'process'].includes(r.kind))
  }
  assert.ok(out.legalReferences.some((r) => r.kind === 'channel')) // SCORES
})
