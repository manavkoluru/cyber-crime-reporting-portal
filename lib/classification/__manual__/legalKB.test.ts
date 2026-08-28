/**
 * Offline tests for the legal KB — no OpenAI, no network.
 *   npm run classify:test
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LEGAL_KB,
  SUBCATEGORY_LEGAL_MAP,
  getLegalEntriesForSubcategory,
  getLegalReferences,
  legalKBIsStub,
} from '../legalKB'
import { FINANCE_FRAUD_SUBCATEGORIES } from '../types'

test('every SUBCATEGORY_LEGAL_MAP key is one of the 7 canonical sub-categories', () => {
  const canonical = new Set<string>(FINANCE_FRAUD_SUBCATEGORIES)
  for (const key of Object.keys(SUBCATEGORY_LEGAL_MAP)) {
    assert.ok(canonical.has(key), `stray map key: ${key}`)
  }
  for (const sub of FINANCE_FRAUD_SUBCATEGORIES) {
    assert.ok(SUBCATEGORY_LEGAL_MAP[sub]?.length, `${sub} has no legal mapping`)
  }
})

test('every chunk_id referenced in the map exists in LEGAL_KB', () => {
  const ids = new Set(LEGAL_KB.map((e) => e.chunk_id))
  for (const sub of FINANCE_FRAUD_SUBCATEGORIES) {
    for (const id of SUBCATEGORY_LEGAL_MAP[sub]) {
      assert.ok(ids.has(id), `${sub} -> unknown chunk_id "${id}"`)
    }
  }
})

test('every KB entry is well-formed (paraphrase, https source, tier, last_verified)', () => {
  for (const e of LEGAL_KB) {
    assert.ok(e.paraphrase && e.paraphrase.length > 20, `thin paraphrase: ${e.chunk_id}`)
    assert.match(e.source_url, /^https:\/\//, `bad url: ${e.chunk_id}`)
    assert.ok([1, 2, 3].includes(e.tier), `bad tier: ${e.chunk_id}`)
    assert.match(e.last_verified, /^\d{4}-\d{2}-\d{2}$/, `bad date: ${e.chunk_id}`)
    assert.ok(e.applicable_subcategories.length > 0, `no subcats: ${e.chunk_id}`)
  }
})

// Tripwire renamed: previously asserted the KB was still stubbed. Now that the real
// KB is loaded, this asserts the opposite — it will fail loudly if the KB regresses.
test('KB is NOT stubbed for any sub-category (real KB is loaded)', () => {
  for (const sub of FINANCE_FRAUD_SUBCATEGORIES) {
    assert.equal(legalKBIsStub(sub), false, `${sub}: unexpectedly stub`)
  }
})

test('getLegalReferences returns entries ordered tier 1 -> 3 with a derived kind', () => {
  for (const sub of FINANCE_FRAUD_SUBCATEGORIES) {
    const refs = getLegalReferences(sub)
    assert.ok(refs.length > 0)
    for (let i = 1; i < refs.length; i++) {
      assert.ok(refs[i].tier >= refs[i - 1].tier, `${sub}: tier not sorted`)
    }
    for (const r of refs) {
      assert.ok(['statute', 'protection', 'channel', 'process'].includes(r.kind))
    }
  }
})

test('kind derivation: RBI -> protection, SCORES -> channel, 1930 flow -> process', () => {
  const byId = Object.fromEntries(
    getLegalEntriesForSubcategory('demat_fraud')
      .concat(getLegalEntriesForSubcategory('upi_fraud'))
      .map((e) => [e.chunk_id, e])
  )
  const kindOf = (id: string) =>
    getLegalReferences(
      byId[id].applicable_subcategories[0] as (typeof FINANCE_FRAUD_SUBCATEGORIES)[number]
    ).find((r) => r.id === id)?.kind

  assert.equal(kindOf('rbi_zero_liability'), 'protection')
  assert.equal(kindOf('sebi_scores_grievance'), 'channel')
  assert.equal(kindOf('cybercrime_portal_1930_flow'), 'process')
  assert.equal(kindOf('bns_318'), 'statute')
})

test('demat_fraud maps to SEBI entries and NOT to RBI/1930 entries', () => {
  const ids = new Set(SUBCATEGORY_LEGAL_MAP['demat_fraud'])
  assert.ok(ids.has('sebi_scores_grievance'))
  assert.ok(ids.has('sebi_unauthorised_trading_2018'))
  assert.ok(!ids.has('rbi_zero_liability'))
  assert.ok(!ids.has('cybercrime_portal_1930_flow'))
})

test('banking sub-categories map to RBI + 1930 process entries', () => {
  for (const sub of ['upi_fraud', 'card_fraud', 'internet_banking_fraud', 'ewallet_theft'] as const) {
    const ids = new Set(SUBCATEGORY_LEGAL_MAP[sub])
    assert.ok(ids.has('rbi_zero_liability'), `${sub} missing RBI`)
    assert.ok(ids.has('cybercrime_portal_1930_flow'), `${sub} missing 1930 flow`)
  }
})
