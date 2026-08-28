/**
 * Offline tests for the overlap dimension of the classifier — no OpenAI, no network.
 * Exercises the deterministic parts: label map coverage, and the parse/coerce/urgent
 * logic via a stubbed OpenAI client.
 *   npm run classify:test
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { runClassifier } from '../classifier'
import { OVERLAP_AREAS, OVERLAP_LABEL } from '../types'

/** Minimal fake OpenAI whose chat.completions.create returns a canned JSON string. */
function fakeOpenAI(payload: unknown) {
  return {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: JSON.stringify(payload) } }],
        }),
      },
    },
  } as any
}

test('OVERLAP_LABEL covers every OverlapArea', () => {
  for (const a of OVERLAP_AREAS) {
    assert.ok(OVERLAP_LABEL[a] && OVERLAP_LABEL[a].length > 0, `no label for ${a}`)
  }
  assert.equal(Object.keys(OVERLAP_LABEL).length, OVERLAP_AREAS.length)
})

test('CLASSIFIED result carries typed overlaps with labels', async () => {
  const c = await runClassifier(
    fakeOpenAI({
      decision: 'SUBCATEGORY',
      subCategory: 'upi_fraud',
      confidence: 0.9,
      moneyAlreadyLost: true,
      overlaps: [
        { area: 'WOMEN_AND_CHILDREN', note: 'A minor was targeted.', urgent: true },
        { area: 'cyber_harassment', note: 'Repeated threatening messages.', urgent: false },
      ],
    }),
    { text: 'someone threatened my daughter and made me pay on gpay' }
  )
  assert.equal(c.status, 'CLASSIFIED')
  assert.equal(c.subCategory, 'upi_fraud')
  assert.equal(c.overlaps.length, 2)
  assert.equal(c.overlaps[0].area, 'WOMEN_AND_CHILDREN')
  assert.equal(c.overlaps[0].label, OVERLAP_LABEL.WOMEN_AND_CHILDREN)
  // lowercase area is coerced
  assert.equal(c.overlaps[1].area, 'CYBER_HARASSMENT')
})

test('overlapUrgent is true when any overlap is urgent', async () => {
  const c = await runClassifier(
    fakeOpenAI({
      decision: 'SUBCATEGORY',
      subCategory: 'card_fraud',
      confidence: 0.9,
      moneyAlreadyLost: false,
      overlaps: [{ area: 'STALKING_DEFAMATION', note: 'x', urgent: true }],
    }),
    { text: 'my card was charged and someone is also stalking me online' }
  )
  assert.equal(c.overlapUrgent, true)
})

test('overlapUrgent is true when time_critical even with no urgent overlap', async () => {
  const c = await runClassifier(
    fakeOpenAI({
      decision: 'SUBCATEGORY',
      subCategory: 'upi_fraud',
      confidence: 0.9,
      moneyAlreadyLost: true, // -> time_critical
      overlaps: [{ area: 'DATA_BREACH', note: 'x', urgent: false }],
    }),
    { text: 'money was debited via upi and my data leaked' }
  )
  assert.equal(c.time_critical, true)
  assert.equal(c.overlapUrgent, true)
})

test('unknown overlap area collapses to OTHER_CYBERCRIME; list is deduped and capped at 3', async () => {
  const c = await runClassifier(
    fakeOpenAI({
      decision: 'SUBCATEGORY',
      subCategory: 'upi_fraud',
      confidence: 0.9,
      overlaps: [
        { area: 'SOMETHING_WEIRD', note: 'a', urgent: false },
        { area: 'ALSO_WEIRD', note: 'b', urgent: false }, // -> OTHER_CYBERCRIME again -> deduped
        { area: 'DATA_BREACH', note: 'c', urgent: false },
        { area: 'CYBER_HARASSMENT', note: 'd', urgent: false },
        { area: 'STALKING_DEFAMATION', note: 'e', urgent: false }, // 4th distinct -> dropped by cap
      ],
    }),
    { text: 'upi fraud plus other stuff' }
  )
  const areas = c.overlaps.map((o) => o.area)
  assert.ok(areas.includes('OTHER_CYBERCRIME'))
  assert.equal(new Set(areas).size, areas.length, 'no duplicates')
  assert.ok(c.overlaps.length <= 3)
})

test('missing / non-array overlaps -> empty list, not a crash', async () => {
  const c = await runClassifier(
    fakeOpenAI({ decision: 'SUBCATEGORY', subCategory: 'upi_fraud', confidence: 0.9 }),
    { text: 'plain upi fraud' }
  )
  assert.deepEqual(c.overlaps, [])
  assert.equal(c.overlapUrgent, false)
})

test('FALLBACK and NEEDS_CLARIFICATION results also carry overlaps fields', async () => {
  const fb = await runClassifier(
    fakeOpenAI({
      decision: 'FALLBACK',
      fallbackCategory: 'NOT_FINANCIAL_FRAUD',
      confidence: 0.8,
      overlaps: [{ area: 'CYBER_HARASSMENT', note: 'x', urgent: true }],
    }),
    { text: 'someone is harassing me, no money involved' }
  )
  assert.equal(fb.status, 'FALLBACK')
  assert.equal(fb.overlaps.length, 1)
  assert.equal(fb.overlapUrgent, true)

  const cl = await runClassifier(
    fakeOpenAI({
      decision: 'CLARIFY',
      candidateSubCategories: ['upi_fraud', 'card_fraud'],
      clarifyingQuestion: 'UPI or card?',
      confidence: 0.6,
      overlaps: [],
    }),
    { text: 'money taken, not sure how' }
  )
  assert.equal(cl.status, 'NEEDS_CLARIFICATION')
  assert.deepEqual(cl.overlaps, [])
})
