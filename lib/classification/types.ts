/**
 * Types for the complaint classification module.
 *
 * This module classifies free-text user input into one of 7 Online Financial Fraud
 * sub-categories, maps it to applicable law (from an approved KB — see legalKB.ts),
 * produces a user-facing explanation, and emits the field requirements the downstream
 * filing module must collect.
 *
 * It does NOT file the complaint.
 */

/**
 * The 7 finance-fraud sub-categories, all nesting under "Online Financial Fraud".
 * snake_case keys — canonical across the module, the legal KB, and field-requirements.json.
 */
export type FinanceFraudSubCategory =
  | 'upi_fraud'
  | 'card_fraud' // debit / credit card
  | 'internet_banking_fraud'
  | 'vishing' // voice phishing
  | 'ewallet_theft'
  | 'demat_fraud'
  | 'email_takeover' // email account takeover leading to financial loss

export const FINANCE_FRAUD_SUBCATEGORIES: FinanceFraudSubCategory[] = [
  'upi_fraud',
  'card_fraud',
  'internet_banking_fraud',
  'vishing',
  'ewallet_theft',
  'demat_fraud',
  'email_takeover',
]

/** Human-readable label per sub-category, for prompts and UI. */
export const SUBCATEGORY_LABEL: Record<FinanceFraudSubCategory, string> = {
  upi_fraud: 'UPI fraud',
  card_fraud: 'Debit/credit card fraud',
  internet_banking_fraud: 'Internet banking fraud',
  vishing: 'Voice phishing (vishing)',
  ewallet_theft: 'E-wallet theft',
  demat_fraud: 'Demat/trading account fraud',
  email_takeover: 'Email account takeover leading to financial loss',
}

export const TOP_LEVEL_CATEGORY = 'Online Financial Fraud' as const

/**
 * Outcome when the input does not map to any of the 7 finance sub-categories.
 * The downstream flow should route these elsewhere, not force a fit.
 */
export type FallbackCategory =
  | 'NOT_FINANCIAL_FRAUD' // e.g. harassment, stalking, CSAM, defamation
  | 'DATA_BREACH_NO_LOSS' // data/identity exposure without a financial transaction
  | 'OTHER_CYBERCRIME'
  | 'UNCLASSIFIABLE' // genuinely not enough signal

/**
 * A non-financial cybercrime angle the incident ALSO touches, alongside the primary
 * financial sub-category. Rakshak AI does not file complaints under these — they are
 * surfaced to the user so they know to pursue them through the right channel.
 */
export type OverlapArea =
  | 'CYBER_HARASSMENT'
  | 'WOMEN_AND_CHILDREN'
  | 'STALKING_DEFAMATION'
  | 'DATA_BREACH'
  | 'OTHER_CYBERCRIME'

export const OVERLAP_AREAS: OverlapArea[] = [
  'CYBER_HARASSMENT',
  'WOMEN_AND_CHILDREN',
  'STALKING_DEFAMATION',
  'DATA_BREACH',
  'OTHER_CYBERCRIME',
]

/** Plain-language label per overlap area, for the user-facing notice. */
export const OVERLAP_LABEL: Record<OverlapArea, string> = {
  CYBER_HARASSMENT: 'cyber harassment / online abuse',
  WOMEN_AND_CHILDREN: 'a women & children safety matter',
  STALKING_DEFAMATION: 'stalking or defamation',
  DATA_BREACH: 'a data breach / identity exposure',
  OTHER_CYBERCRIME: 'another cybercrime',
}

export interface ClassificationOverlap {
  area: OverlapArea
  /** Display label from OVERLAP_LABEL. */
  label: string
  /** One plain sentence on how the incident touches this area. */
  note: string
  /** The model flagged this angle as urgent / ongoing. */
  urgent: boolean
}

/**
 * A single applicable legal / procedural provision, drawn ONLY from the KB
 * (`legalKB.ts` — `LEGAL_KB` entries). Shape mirrors `LegalKBEntry`.
 */
export interface LegalReference {
  /** KB chunk id, e.g. "bns_318", "rbi_zero_liability", "sebi_scores_grievance". */
  id: string
  /** Source document, e.g. "Bharatiya Nyaya Sanhita, 2023". */
  instrument: string
  /** Section / circular / step reference, e.g. "Section 318", "RBI/2017-18/15, para on Zero Liability". */
  section: string
  /** One succinct plain-language PARAPHRASE. Never a quotation. From the KB. */
  paraphrase: string
  /** Inline link to the official source. */
  sourceUrl: string
  /**
   * KB tier: 1 = core statute/right/process to always surface, 2 = situational,
   * 3 = deep background. `explain.ts` leads with tier 1.
   */
  tier: 1 | 2 | 3
  /**
   * Coarse kind, derived from the source document, so `explain.ts` can group:
   * 'statute' (BNS / IT Act), 'protection' (RBI liability & timelines),
   * 'channel' (SEBI SCORES and other where-to-also-report), 'process' (1930 / portal flow).
   */
  kind: 'statute' | 'protection' | 'channel' | 'process'
}

export type FieldRequirement = {
  /** snake_case machine key the filing module will use. */
  key: string
  /** Human-readable label shown to the user when this field is requested. */
  label: string
}

/** Field requirements for one sub-category. Mirrors field-requirements.json. */
export interface SubCategoryFieldFile {
  subCategory: FinanceFraudSubCategory
  label: string
  topLevelCategory: typeof TOP_LEVEL_CATEGORY
  /**
   * Guidance on what the shared `institution_name` field means for THIS sub-category
   * (e.g. for UPI fraud it's the debited bank, not the UPI app).
   */
  institution_field_hint: string
  /**
   * Mandatory fields BEYOND the shared `common.mandatory_fields`. Per the live NCRP
   * intake, the 7 sub-categories add no extra mandatory fields — so this is [].
   * Kept in the schema so a future portal change can add one without a code change.
   */
  mandatory_fields: FieldRequirement[]
  /** Sub-category-specific fields that help but the portal does not require. */
  optional_fields: FieldRequirement[]
  /** Plain-language note on what evidence type is most useful. */
  evidence_notes: string
}

/**
 * Fields the NCRP intake asks for on EVERY financial-fraud complaint regardless of
 * sub-category. Kept separate so the per-category files stay focused on what differs.
 */
export interface CommonFieldFile {
  mandatory_fields: FieldRequirement[]
  optional_fields: FieldRequirement[]
}

export interface FieldRequirementsFile {
  /** ISO date this list was last checked against the live portal. */
  verifiedAgainstPortalOn: string | null
  /** Reference used when proposing the list. */
  source?: string
  common: CommonFieldFile
  subCategories: Record<FinanceFraudSubCategory, SubCategoryFieldFile>
}

/** What the classifier returns to the caller for one user turn. */
export interface ClassificationResult {
  status: 'CLASSIFIED' | 'NEEDS_CLARIFICATION' | 'FALLBACK'

  /** Present when status === 'CLASSIFIED'. */
  topLevelCategory?: typeof TOP_LEVEL_CATEGORY
  subCategory?: FinanceFraudSubCategory

  /** Present when status === 'FALLBACK'. */
  fallbackCategory?: FallbackCategory

  /** 0..1. How confident the model is in the (sub)category or fallback decision. */
  confidence: number

  /**
   * Present when status === 'NEEDS_CLARIFICATION': exactly ONE question to disambiguate
   * between the two candidate sub-categories, plus the candidates themselves.
   */
  clarifyingQuestion?: string
  candidateSubCategories?: FinanceFraudSubCategory[]

  /**
   * True when the user indicates money has already left their account.
   * Downstream logic should surface the 1930 helpline step ahead of full field collection.
   */
  time_critical: boolean

  /**
   * Non-financial cybercrime angles the incident ALSO touches (harassment, women &
   * children safety, stalking, a data breach, …). The primary decision above is
   * unaffected — these are surfaced so the user knows Rakshak AI can't file them here.
   * Empty when there is no overlap.
   */
  overlaps: ClassificationOverlap[]

  /** True if any `overlaps` entry is urgent, OR `time_critical` is true. */
  overlapUrgent: boolean

  /**
   * User-facing explanation: 2-4 reassuring plain-language sentences naming the
   * category/sub-category, then grouped paraphrase + link lines — the laws that
   * apply, the customer's protections (RBI), and where else / how to report
   * (SEBI SCORES, 1930 portal process). Empty for NEEDS_CLARIFICATION.
   */
  explanation: string

  /** Every KB entry used to build `explanation`. Empty for NEEDS_CLARIFICATION. */
  legalReferences: LegalReference[]

  /**
   * The field-requirements file for the confirmed sub-category, ready to hand to the
   * filing module. Only populated once status === 'CLASSIFIED'.
   */
  fieldFile?: SubCategoryFieldFile & { common: CommonFieldFile }

  /**
   * The details already known this conversation (free-flow chat + image/PDF extraction),
   * mapped onto `fieldFile`'s checklist. Present when status === 'CLASSIFIED' and the
   * caller passed `knownDetails`. The user is NEVER asked to fill fields directly —
   * `mappedFields.missingMandatory` is what the filing module still needs to obtain,
   * and `mappedFields.filledOptional` is what it must NOT re-ask.
   */
  mappedFields?: import('./mapDetails').MappedFields
}
