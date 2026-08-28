/**
 * Offline tests for mapDetailsToChecklist — no OpenAI, no network.
 *   npm run classify:test
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mapDetailsToChecklist } from '../mapDetails'
import type { LooseDetails } from '../mapDetails'

test('IDA / extraction keys are aliased onto the upi_fraud checklist keys', () => {
  const details: LooseDetails = {
    utr_or_transaction_id: '770941216078',
    amount_stolen: '8400',
    sender_bank: 'ICICI',
    payment_platform: 'GPay',
    user_phone: '9876543210',
  }
  const m = mapDetailsToChecklist('upi_fraud', details)

  assert.equal(m.known['transaction_id_or_utr'], '770941216078')
  assert.equal(m.known['fraud_amount'], '8400')
  // upi_fraud now has its OWN sender_bank optional key -> wins over the shared institution_name
  assert.equal(m.known['sender_bank'], 'ICICI')
  assert.ok(!('institution_name' in m.known))
  // payment_platform -> payment_app_used (upi optional)
  assert.equal(m.known['payment_app_used'], 'GPay')
  // user_phone is a upi_fraud mandatory key -> exact match, not aliased to complainant_mobile
  assert.equal(m.known['user_phone'], '9876543210')
})

test('details with no checklist slot are preserved in unmapped, not dropped', () => {
  const m = mapDetailsToChecklist('upi_fraud', {
    recipient_name: 'Ramesh Kumar', // IDA_KEY_ALIASES maps this to [] -> unmapped
    some_random_key: 'keep me too',
  })
  assert.equal(m.unmapped['recipient_name'], 'Ramesh Kumar')
  assert.equal(m.unmapped['some_random_key'], 'keep me too')
  assert.ok(!('recipient_name' in m.known))
})

test('missingMandatory excludes supplied fields and includes the rest (upi_fraud agent set)', () => {
  const m = mapDetailsToChecklist('upi_fraud', {
    utr_or_transaction_id: '770941216078',
    amount_stolen: '8400',
    destination_vpa_or_account: 'fraudster@okhdfcbank',
  })
  const missingKeys = m.missingMandatory.map((f) => f.key)

  assert.ok(!missingKeys.includes('transaction_id_or_utr'))
  assert.ok(!missingKeys.includes('fraud_amount'))
  assert.ok(!missingKeys.includes('fraudster_upi_id_or_vpa'))
  // upi_fraud agent mandatory set — not supplied -> still required
  assert.ok(missingKeys.includes('incident_date_time'))
  assert.ok(missingKeys.includes('user_phone'))
  assert.ok(missingKeys.includes('user_location'))
  assert.ok(missingKeys.includes('incident_description'))
  // portal-only field NOT in the upi_fraud agent list -> not reported here
  assert.ok(!missingKeys.includes('complainant_id_proof'))
})

test('filledOptional lists supplied optional keys', () => {
  const m = mapDetailsToChecklist('upi_fraud', {
    payment_platform: 'PhonePe', // -> payment_app_used (UPI optional)
    recipient_phone: '9998887777', // -> suspect_mobile (common optional; UPI has no fraudster_phone_number)
  })
  const filled = m.filledOptional.map((f) => f.key)
  assert.ok(filled.includes('payment_app_used'))
  assert.ok(filled.includes('suspect_mobile'))
})

test('VISHING optional fraudster_phone_number is filled from recipient_phone alias', () => {
  const m = mapDetailsToChecklist('vishing', { recipient_phone: '9998887777' })
  const filled = m.filledOptional.map((f) => f.key)
  // VISHING optional list DOES include fraudster_phone_number
  assert.ok(filled.includes('fraudster_phone_number'))
})

test('timeCritical removes incident_description from missingMandatory', () => {
  const withoutFlag = mapDetailsToChecklist('vishing', {})
  const withFlag = mapDetailsToChecklist('vishing', {}, { timeCritical: true })

  assert.ok(withoutFlag.missingMandatory.some((f) => f.key === 'incident_description'))
  assert.ok(!withFlag.missingMandatory.some((f) => f.key === 'incident_description'))
})

test('first non-empty value wins when two IDA keys map to the same target', () => {
  // card_fraud has no own sender/receiver bank keys, so both fall back to institution_name.
  const m = mapDetailsToChecklist('card_fraud', {
    sender_bank: 'ICICI',
    receiver_bank: 'HDFC', // both alias to institution_name; sender seen first
  })
  assert.equal(m.known['institution_name'], 'ICICI')
})

test('upi_fraud keeps sender_bank and receiver_bank as distinct optional keys', () => {
  const m = mapDetailsToChecklist('upi_fraud', {
    sender_bank: 'ICICI',
    receiver_bank: 'HDFC',
  })
  assert.equal(m.known['sender_bank'], 'ICICI')
  assert.equal(m.known['receiver_bank'], 'HDFC')
})

test('empty / null / whitespace values are ignored', () => {
  const m = mapDetailsToChecklist('upi_fraud', {
    amount_stolen: '',
    utr_or_transaction_id: '   ',
    sender_bank: null,
  })
  assert.deepEqual(m.known, {})
  assert.ok(m.missingMandatory.some((f) => f.key === 'fraud_amount'))
})
