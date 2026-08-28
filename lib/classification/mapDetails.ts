/**
 * Maps whatever the conversation has ALREADY surfaced — free-flow chat text, plus
 * details the chat's image/PDF recognition (IDA) pulled out — onto this module's
 * internal field checklist for a confirmed sub-category.
 *
 * Principle: the user is NEVER expected to fill fields. Optional fields are captured
 * opportunistically. This function takes the loose bag of details we happen to have
 * and slots each into the right `key`, so the filing module can see:
 *   - which MANDATORY fields are still genuinely missing (must be collected)
 *   - which OPTIONAL fields we already have (never re-ask)
 *   - leftover details that didn't map to any known key (kept for the officer/record)
 *
 * It does no LLM work — it's a deterministic reshuffle of already-extracted data.
 */

import { getFieldFileForFiling } from './fieldRequirements'
import type { FinanceFraudSubCategory, FieldRequirement } from './types'

/**
 * A permissive bag of details the caller already has. Keys can be:
 *   - our own checklist keys (from field-requirements.json), OR
 *   - IDA / extraction keys (see IDA_KEY_ALIASES below), OR
 *   - anything else — unknown keys are preserved as `unmapped`.
 * Values may be string | number | boolean | null.
 */
export type LooseDetails = Record<string, string | number | boolean | null | undefined>

export interface MappedFields {
  /** checklist key -> value we already have for it */
  known: Record<string, string | number | boolean>
  /** mandatory checklist entries with no value yet — the filing module must collect these */
  missingMandatory: FieldRequirement[]
  /** optional checklist entries we happen to already have — never ask for these */
  filledOptional: FieldRequirement[]
  /** details that didn't match any checklist key — keep for the record, don't discard */
  unmapped: Record<string, string | number | boolean>
}

/**
 * Aliases from IDA / image-PDF extraction field names -> this module's checklist keys.
 * Extend as the extraction schema grows. One IDA key may feed several checklist keys
 * across sub-categories; that's fine — only keys present in the active checklist are used.
 */
const IDA_KEY_ALIASES: Record<string, string[]> = {
  // transaction identity
  utr_or_transaction_id: ['transaction_id_or_utr'],
  phonepe_transaction_id: ['transaction_id_or_utr'],
  // money
  amount_stolen: ['fraud_amount'],
  // institution — prefer the sub-category's own bank keys, fall back to the shared name
  sender_bank: ['sender_bank', 'institution_name'],
  receiver_bank: ['receiver_bank', 'institution_name'],
  payment_platform: ['payment_app_used', 'institution_name'],
  // counterparties
  destination_vpa_or_account: ['fraudster_upi_id_or_vpa', 'beneficiary_wallet_or_upi', 'suspect_bank_account'],
  recipient_phone: ['fraudster_phone_number', 'suspect_mobile'],
  recipient_name: [], // no checklist slot — becomes `unmapped` (kept for record)
  // narrative / time
  fraud_narrative: ['incident_description'],
  time_since_fraud_minutes: ['incident_date_time'],
  time_display: [], // display-only
  // complainant — prefer the sub-category's own keys, fall back to the shared ones
  user_phone: ['user_phone', 'complainant_mobile', 'victim_registered_mobile', 'wallet_registered_mobile'],
  user_location: ['user_location', 'incident_district'],
}

function isPresent(v: unknown): v is string | number | boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim() !== ''
  return typeof v === 'number' || typeof v === 'boolean'
}

/**
 * @param subCategory  the confirmed sub-category
 * @param details      everything already known (chat + IDA extraction), loosely keyed
 * @param opts.timeCritical  if money is already lost, `incident_description` (the 200-char
 *                           narrative) is NOT treated as blocking here — the filing module
 *                           surfaces 1930 first and can collect the full narrative after.
 */
export function mapDetailsToChecklist(
  subCategory: FinanceFraudSubCategory,
  details: LooseDetails,
  opts: { timeCritical?: boolean } = {}
): MappedFields {
  const file = getFieldFileForFiling(subCategory)
  // If a sub-category declares its own mandatory_fields it is an agent-backed flow
  // (e.g. upi_fraud mirrors fileComplaint.ts). That list is authoritative and REPLACES
  // the portal common mandatory set — the chat agent collects exactly this, no more.
  // Sub-categories with `mandatory_fields: []` fall back to the portal common set.
  const mandatory =
    file.mandatory_fields.length > 0
      ? file.mandatory_fields
      : file.common.mandatory_fields
  const optional = [...file.optional_fields, ...file.common.optional_fields]

  const mandatoryKeys = new Set(mandatory.map((f) => f.key))
  const optionalKeys = new Set(optional.map((f) => f.key))
  const allKeys = new Set([...mandatoryKeys, ...optionalKeys])

  const known: Record<string, string | number | boolean> = {}
  const unmapped: Record<string, string | number | boolean> = {}

  const assign = (key: string, value: string | number | boolean) => {
    if (allKeys.has(key)) {
      if (!(key in known)) known[key] = value // first non-empty wins
    } else {
      unmapped[key] = value
    }
  }

  for (const [rawKey, rawVal] of Object.entries(details)) {
    if (!isPresent(rawVal)) continue
    const value = rawVal

    if (allKeys.has(rawKey)) {
      assign(rawKey, value)
      continue
    }
    const aliases = IDA_KEY_ALIASES[rawKey]
    if (aliases && aliases.length > 0) {
      // Place into the FIRST alias target present in this sub-category's checklist.
      // Aliases are ordered most-specific first (e.g. `sender_bank` before the
      // shared `institution_name`), so one raw value maps to one checklist key.
      const target = aliases.find((t) => allKeys.has(t))
      if (target) assign(target, value)
      else unmapped[rawKey] = value
    } else {
      unmapped[rawKey] = value
    }
  }

  const missingMandatory = mandatory.filter((f) => {
    if (f.key in known) return false
    if (opts.timeCritical && f.key === 'incident_description') return false
    return true
  })

  const filledOptional = optional.filter((f) => f.key in known)

  return { known, missingMandatory, filledOptional, unmapped }
}
