// legalKB.ts
// Legal knowledge base for the cybercrime-filing chatbot classification module.
// Paraphrase-only (no verbatim statute/circular text) with linked official sources.
// No human-approval gate — entries are auto-published; `last_verified` drives the
// freshness-check job.

import type { FinanceFraudSubCategory, LegalReference } from './types'

export interface LegalKBEntry {
  chunk_id: string
  source_doc: string
  section_ref: string
  source_url: string
  tier: 1 | 2 | 3
  applicable_subcategories: string[]
  paraphrase: string
  last_verified: string // ISO date
}

export const LEGAL_KB: LegalKBEntry[] = [
  // ---------- BNS 2023 ----------
  {
    chunk_id: 'bns_318',
    source_doc: 'Bharatiya Nyaya Sanhita, 2023',
    section_ref: 'Section 318',
    source_url:
      'https://www.indiacode.nic.in/bitstream/123456789/20062/1/bharatiya_nyaya_sanhita%2C_2023.pdf',
    tier: 1,
    applicable_subcategories: [
      'upi_fraud',
      'card_fraud',
      'internet_banking_fraud',
      'ewallet_theft',
      'vishing',
      'demat_fraud',
      'email_takeover',
    ],
    paraphrase:
      'Covers cheating someone into handing over money or property by deceiving them — this is the section that usually applies when a fraudster tricks a victim into transferring funds.',
    last_verified: '2026-08-28',
  },
  {
    chunk_id: 'bns_319',
    source_doc: 'Bharatiya Nyaya Sanhita, 2023',
    section_ref: 'Section 319',
    source_url:
      'https://www.indiacode.nic.in/bitstream/123456789/20062/1/bharatiya_nyaya_sanhita%2C_2023.pdf',
    tier: 1,
    applicable_subcategories: ['vishing', 'email_takeover', 'upi_fraud'],
    paraphrase:
      'Covers cheating by pretending to be someone else — relevant when a fraudster impersonates a bank official, relative, or known contact to deceive the victim.',
    last_verified: '2026-08-28',
  },
  {
    chunk_id: 'bns_316',
    source_doc: 'Bharatiya Nyaya Sanhita, 2023',
    section_ref: 'Section 316',
    source_url:
      'https://www.indiacode.nic.in/bitstream/123456789/20062/1/bharatiya_nyaya_sanhita%2C_2023.pdf',
    tier: 2,
    applicable_subcategories: ['demat_fraud'],
    paraphrase:
      'Covers criminal breach of trust — dishonest misuse of property or funds someone was entrusted with, relevant when a broker or intermediary misuses account access.',
    last_verified: '2026-08-28',
  },
  {
    chunk_id: 'bns_336',
    source_doc: 'Bharatiya Nyaya Sanhita, 2023',
    section_ref: 'Section 336',
    source_url:
      'https://www.indiacode.nic.in/bitstream/123456789/20062/1/bharatiya_nyaya_sanhita%2C_2023.pdf',
    tier: 2,
    applicable_subcategories: ['email_takeover', 'demat_fraud'],
    paraphrase:
      'Covers forgery — creating a false document or electronic record to cause harm or fraudulently obtain property, relevant when fake documents or records were used in the fraud.',
    last_verified: '2026-08-28',
  },

  // ---------- IT Act, 2000 ----------
  {
    chunk_id: 'it_act_66c',
    source_doc: 'Information Technology Act, 2000',
    section_ref: 'Section 66C',
    source_url: 'https://www.meity.gov.in/static/uploads/2024/03/IT-Act-Rules_2000_0.pdf',
    tier: 1,
    applicable_subcategories: [
      'upi_fraud',
      'card_fraud',
      'internet_banking_fraud',
      'ewallet_theft',
      'email_takeover',
      'demat_fraud',
    ],
    paraphrase:
      "Covers identity theft — dishonestly using someone else's password, electronic signature, or other unique ID feature, relevant whenever stolen login credentials or OTPs were used.",
    last_verified: '2026-08-28',
  },
  {
    chunk_id: 'it_act_66d',
    source_doc: 'Information Technology Act, 2000',
    section_ref: 'Section 66D',
    source_url: 'https://www.meity.gov.in/static/uploads/2024/03/IT-Act-Rules_2000_0.pdf',
    tier: 1,
    applicable_subcategories: ['vishing', 'email_takeover', 'upi_fraud'],
    paraphrase:
      'Covers cheating by impersonation using a computer or communication device — relevant when a fraudster posed as someone else over phone, email, or app to deceive the victim.',
    last_verified: '2026-08-28',
  },
  {
    chunk_id: 'it_act_43',
    source_doc: 'Information Technology Act, 2000',
    section_ref: 'Section 43',
    source_url: 'https://www.meity.gov.in/static/uploads/2024/03/IT-Act-Rules_2000_0.pdf',
    tier: 2,
    applicable_subcategories: ['internet_banking_fraud', 'demat_fraud', 'email_takeover'],
    paraphrase:
      'Covers unauthorized access to a computer system or data, including causing financial loss through such access — relevant when an account was accessed without permission.',
    last_verified: '2026-08-28',
  },

  // ---------- RBI (banking-channel fraud only) ----------
  {
    chunk_id: 'rbi_zero_liability',
    source_doc:
      'RBI Circular — Customer Protection: Limiting Liability of Customers in Unauthorised Electronic Banking Transactions',
    section_ref: 'RBI/2017-18/15, para on Zero Liability',
    source_url:
      'https://www.rbi.org.in/commonman/english/scripts/Notification.aspx?Id=2336',
    tier: 1,
    applicable_subcategories: [
      'upi_fraud',
      'card_fraud',
      'internet_banking_fraud',
      'ewallet_theft',
    ],
    paraphrase:
      "If the fraud happened due to the bank's fault or a third-party breach with no fault of the customer, and it's reported within 3 working days of the bank's alert, the customer isn't liable for the loss at all.",
    last_verified: '2026-08-28',
  },
  {
    chunk_id: 'rbi_limited_liability',
    source_doc:
      'RBI Circular — Customer Protection: Limiting Liability of Customers in Unauthorised Electronic Banking Transactions',
    section_ref: 'RBI/2017-18/15, para on Limited Liability',
    source_url:
      'https://www.rbi.org.in/commonman/english/scripts/Notification.aspx?Id=2336',
    tier: 1,
    applicable_subcategories: [
      'upi_fraud',
      'card_fraud',
      'internet_banking_fraud',
      'ewallet_theft',
    ],
    paraphrase:
      "Reporting the fraud between 4 to 7 working days after the bank's alert caps the customer's liability at a limited amount, rather than the full loss — the exact cap depends on the account type.",
    last_verified: '2026-08-28',
  },
  {
    chunk_id: 'rbi_reversal_timeline',
    source_doc:
      'RBI Circular — Customer Protection: Limiting Liability of Customers in Unauthorised Electronic Banking Transactions',
    section_ref: 'RBI/2017-18/15, para on resolution timelines',
    source_url:
      'https://www.rbi.org.in/commonman/english/scripts/Notification.aspx?Id=2336',
    tier: 1,
    applicable_subcategories: [
      'upi_fraud',
      'card_fraud',
      'internet_banking_fraud',
      'ewallet_theft',
    ],
    paraphrase:
      "Once notified, the bank must credit the disputed amount back to the customer's account within 10 working days, without waiting for any insurance claim to be settled, and the full complaint must be resolved within 90 days.",
    last_verified: '2026-08-28',
  },

  // ---------- SEBI (demat / trading-account fraud only) ----------
  {
    chunk_id: 'sebi_unauthorised_trading_2018',
    source_doc: 'SEBI Circular — Prevention of Unauthorised Trading by Stock Brokers',
    section_ref: 'SEBI/HO/MIRSD/DOP1/CIR/P/2018/54',
    source_url:
      'https://www.sebi.gov.in/legal/circulars/mar-2018/circular-on-prevention-of-unauthorised-trading-by-stock-brokers-_38365.html',
    tier: 1,
    applicable_subcategories: ['demat_fraud'],
    paraphrase:
      "Stock brokers are required to follow safeguards that prevent trades from being placed on a client's account without their authorization, and clients can hold the broker accountable if unauthorised trades occur.",
    last_verified: '2026-08-28',
  },
  {
    chunk_id: 'sebi_scores_grievance',
    source_doc: 'SEBI Complaints Redress System (SCORES)',
    section_ref: 'SCORES Portal — Investor Grievance Mechanism',
    source_url: 'https://scores.sebi.gov.in/',
    tier: 1,
    applicable_subcategories: ['demat_fraud'],
    paraphrase:
      'Investors can file a complaint against a broker, depository participant, or other SEBI-registered intermediary directly on the SCORES portal, separate from the cybercrime.gov.in police complaint — this is the right channel for unauthorized trades, fund misappropriation, or account access disputes.',
    last_verified: '2026-08-28',
  },
  {
    chunk_id: 'sebi_scores_timeline',
    source_doc: 'SEBI Complaints Redress System (SCORES)',
    section_ref: 'SCORES resolution timeline norms',
    source_url: 'https://scores.sebi.gov.in/',
    tier: 2,
    applicable_subcategories: ['demat_fraud'],
    paraphrase:
      'SEBI-registered intermediaries are required to respond to and resolve investor complaints filed through SCORES within a defined window — typically around 21 days — before the matter can be escalated further.',
    last_verified: '2026-08-28',
  },

  // ---------- National Cyber Crime Reporting Portal / 1930 process ----------
  {
    chunk_id: 'cybercrime_portal_1930_flow',
    source_doc:
      'Citizen Financial Cyber Frauds Reporting and Management System — Instructions',
    section_ref: 'Steps ii–iv',
    source_url:
      'https://cybercrime.gov.in/uploadmedia/instructions_citizenreportingcyberfrauds.pdf',
    tier: 1,
    applicable_subcategories: [
      'upi_fraud',
      'card_fraud',
      'internet_banking_fraud',
      'ewallet_theft',
      'vishing',
    ],
    paraphrase:
      "After reporting on the 1930 helpline, you'll receive a login ID and acknowledgement number by SMS or email — you must complete registration of the complaint on cybercrime.gov.in within 24 hours for it to be valid.",
    last_verified: '2026-08-28',
  },
  {
    chunk_id: 'cybercrime_portal_bank_action',
    source_doc:
      'Citizen Financial Cyber Frauds Reporting and Management System — Instructions',
    section_ref: 'Steps v–vi',
    source_url:
      'https://cybercrime.gov.in/uploadmedia/instructions_citizenreportingcyberfrauds.pdf',
    tier: 1,
    applicable_subcategories: [
      'upi_fraud',
      'card_fraud',
      'internet_banking_fraud',
      'ewallet_theft',
      'vishing',
    ],
    paraphrase:
      'Once your complaint is received, a police officer reviews it and notifies the relevant bank, wallet provider, or financial intermediary to block the fraudulently transferred funds where possible.',
    last_verified: '2026-08-28',
  },
]

// ---------- Sub-category -> applicable legal chunk IDs ----------
export const SUBCATEGORY_LEGAL_MAP: Record<string, string[]> = {
  upi_fraud: [
    'bns_318',
    'bns_319',
    'it_act_66c',
    'it_act_66d',
    'rbi_zero_liability',
    'rbi_limited_liability',
    'rbi_reversal_timeline',
    'cybercrime_portal_1930_flow',
    'cybercrime_portal_bank_action',
  ],
  card_fraud: [
    'bns_318',
    'it_act_66c',
    'rbi_zero_liability',
    'rbi_limited_liability',
    'rbi_reversal_timeline',
    'cybercrime_portal_1930_flow',
    'cybercrime_portal_bank_action',
  ],
  internet_banking_fraud: [
    'bns_318',
    'it_act_66c',
    'it_act_43',
    'rbi_zero_liability',
    'rbi_limited_liability',
    'rbi_reversal_timeline',
    'cybercrime_portal_1930_flow',
    'cybercrime_portal_bank_action',
  ],
  vishing: [
    'bns_318',
    'bns_319',
    'it_act_66d',
    'cybercrime_portal_1930_flow',
    'cybercrime_portal_bank_action',
  ],
  ewallet_theft: [
    'bns_318',
    'it_act_66c',
    'rbi_zero_liability',
    'rbi_limited_liability',
    'rbi_reversal_timeline',
    'cybercrime_portal_1930_flow',
    'cybercrime_portal_bank_action',
  ],
  demat_fraud: [
    'bns_318',
    'bns_316',
    'bns_336',
    'it_act_66c',
    'it_act_43',
    'sebi_unauthorised_trading_2018',
    'sebi_scores_grievance',
    'sebi_scores_timeline',
  ],
  email_takeover: [
    'bns_318',
    'bns_319',
    'bns_336',
    'it_act_66c',
    'it_act_43',
  ],
}

// ---------- Helper: retrieve raw KB entries for a sub-category ----------
export function getLegalEntriesForSubcategory(subcategory: string): LegalKBEntry[] {
  const chunkIds = SUBCATEGORY_LEGAL_MAP[subcategory] ?? []
  return LEGAL_KB.filter((entry) => chunkIds.includes(entry.chunk_id))
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter: the rest of the module consumes `LegalReference` (see types.ts), a
// slightly normalised view of `LegalKBEntry` with a derived `kind` for grouping.
// ─────────────────────────────────────────────────────────────────────────────

function kindOf(entry: LegalKBEntry): LegalReference['kind'] {
  const doc = entry.source_doc.toLowerCase()
  if (doc.startsWith('rbi circular')) return 'protection'
  if (entry.chunk_id.startsWith('sebi_scores')) return 'channel'
  if (entry.chunk_id.startsWith('cybercrime_portal')) return 'process'
  return 'statute' // BNS, IT Act, SEBI unauthorised-trading circular
}

function toLegalReference(entry: LegalKBEntry): LegalReference {
  return {
    id: entry.chunk_id,
    instrument: entry.source_doc,
    section: entry.section_ref,
    paraphrase: entry.paraphrase,
    sourceUrl: entry.source_url,
    tier: entry.tier,
    kind: kindOf(entry),
  }
}

/** Applicable `LegalReference[]` for a sub-category, ordered tier 1 → 3. */
export function getLegalReferences(
  subCategory: FinanceFraudSubCategory
): LegalReference[] {
  return getLegalEntriesForSubcategory(subCategory)
    .map(toLegalReference)
    .sort((a, b) => a.tier - b.tier)
}

/**
 * True only if the KB has NO usable paraphrase for this sub-category. With the real
 * KB loaded this is always false; kept so `explain.ts` / callers can guard uniformly.
 */
export function legalKBIsStub(subCategory: FinanceFraudSubCategory): boolean {
  return getLegalReferences(subCategory).length === 0
}
