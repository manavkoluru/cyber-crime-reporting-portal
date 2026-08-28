/**
 * Offline tests for the field-requirements loader — no OpenAI, no network.
 *   npm run classify:test
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FIELD_REQUIREMENTS,
  getCommonFields,
  getFieldFileForFiling,
  fieldRequirementsUnverified,
} from '../fieldRequirements'
import { FINANCE_FRAUD_SUBCATEGORIES } from '../types'

const PORTAL_MANDATORY_KEYS = [
  'incident_date_time',
  'incident_description',
  'complainant_id_proof',
  'institution_name',
  'transaction_id_or_utr',
  'transaction_date',
  'fraud_amount',
]

const SUSPECT_KEYS = [
  'suspect_mobile',
  'suspect_email',
  'suspect_bank_account',
  'suspect_address',
  'suspect_photo',
  'suspect_website_or_handle',
]

test('all 7 sub-categories are present', () => {
  for (const sub of FINANCE_FRAUD_SUBCATEGORIES) {
    assert.ok(FIELD_REQUIREMENTS.subCategories[sub], `missing ${sub}`)
  }
  assert.equal(
    Object.keys(FIELD_REQUIREMENTS.subCategories).length,
    FINANCE_FRAUD_SUBCATEGORIES.length
  )
})

test('common.mandatory_fields is exactly the 7 portal-required keys', () => {
  const keys = getCommonFields().mandatory_fields.map((f) => f.key).sort()
  assert.deepEqual(keys, [...PORTAL_MANDATORY_KEYS].sort())
})

test('sub-category mandatory_fields: [] unless it mirrors a chat agent flow', () => {
  // upi_fraud intentionally lists the fileComplaint chat agent's collect-and-block set.
  // Other sub-categories add no extra mandatory fields (portal common set only).
  const AGENT_BACKED = new Set(['upi_fraud'])
  for (const sub of FINANCE_FRAUD_SUBCATEGORIES) {
    const extra = FIELD_REQUIREMENTS.subCategories[sub].mandatory_fields
    if (AGENT_BACKED.has(sub)) {
      assert.ok(extra.length > 0, `${sub} should mirror its agent's mandatory set`)
    } else {
      assert.deepEqual(extra, [], `${sub} should have mandatory_fields: []`)
    }
  }
})

test('upi_fraud mandatory_fields match the fileComplaint agent hard-block set', () => {
  const keys = FIELD_REQUIREMENTS.subCategories.upi_fraud.mandatory_fields
    .map((f) => f.key)
    .sort()
  assert.deepEqual(keys, [
    'fraud_amount',
    'fraudster_upi_id_or_vpa',
    'incident_date_time',
    'incident_description',
    'transaction_id_or_utr',
    'user_location',
    'user_phone',
  ])
})

test('every suspect/* key is optional, none mandatory', () => {
  const commonMandatory = new Set(getCommonFields().mandatory_fields.map((f) => f.key))
  const commonOptional = new Set(getCommonFields().optional_fields.map((f) => f.key))
  for (const k of SUSPECT_KEYS) {
    assert.ok(!commonMandatory.has(k), `${k} must not be mandatory`)
    assert.ok(commonOptional.has(k), `${k} must be in common.optional_fields`)
  }
  // and not smuggled into any sub-category's mandatory list
  for (const sub of FINANCE_FRAUD_SUBCATEGORIES) {
    for (const f of FIELD_REQUIREMENTS.subCategories[sub].mandatory_fields) {
      assert.ok(!SUSPECT_KEYS.includes(f.key))
    }
  }
})

test('getFieldFileForFiling merges the common block in', () => {
  const file = getFieldFileForFiling('upi_fraud')
  assert.ok(Array.isArray(file.common.mandatory_fields))
  assert.equal(file.subCategory, 'upi_fraud')
  assert.ok(file.institution_field_hint.length > 0)
  assert.ok(file.evidence_notes.length > 0)
})

test('field list is still marked unverified against the live portal', () => {
  assert.equal(FIELD_REQUIREMENTS.verifiedAgainstPortalOn, null)
  assert.equal(fieldRequirementsUnverified(), true)
})

test('every field entry has a non-empty key and label', () => {
  const check = (arr: { key: string; label: string }[], where: string) => {
    for (const f of arr) {
      assert.ok(f.key && /^[a-z0-9_]+$/.test(f.key), `${where}: bad key ${JSON.stringify(f.key)}`)
      assert.ok(f.label && f.label.trim().length > 0, `${where}: empty label for ${f.key}`)
    }
  }
  check(getCommonFields().mandatory_fields, 'common.mandatory')
  check(getCommonFields().optional_fields, 'common.optional')
  for (const sub of FINANCE_FRAUD_SUBCATEGORIES) {
    check(FIELD_REQUIREMENTS.subCategories[sub].optional_fields, `${sub}.optional`)
  }
})
