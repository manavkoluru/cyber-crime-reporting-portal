/**
 * Complaint classification subsystem.
 *
 * Purpose: take free-text user input, classify it into one of 7 Online Financial Fraud
 * sub-categories (or a clarifying question / fallback), explain the applicable law to the
 * user from an approved KB, and emit the field-requirements file the downstream FILING
 * module will consume. This subsystem does NOT file the complaint.
 *
 * Invoke `runClassifier(openai, { text })` from the chat flow at the point you choose.
 * On `status: 'NEEDS_CLARIFICATION'`, show `clarifyingQuestion`, then call again with
 * `{ text: <original + user's answer>, priorCandidates: candidateSubCategories }`.
 * On `status: 'CLASSIFIED'`, persist `subCategory`, `confidence`, `explanation`, and hand
 * `fieldFile` to the filing module.
 *
 * STATUS:
 *   - legalKB.ts entries are STUBS — populate from the approved paraphrase+citation KB.
 *   - field-requirements.json is PROPOSED — confirm against the live NCRP intake form,
 *     then set `verifiedAgainstPortalOn`.
 */

export { runClassifier } from './classifier'
export type { ClassifyInput } from './classifier'

export { mapDetailsToChecklist } from './mapDetails'
export type { LooseDetails, MappedFields } from './mapDetails'

export { buildExplanation, buildClassificationPreamble } from './explain'
export type { ExplanationOutput } from './explain'

export {
  FIELD_REQUIREMENTS,
  getCommonFields,
  getSubCategoryFieldFile,
  getFieldFileForFiling,
  fieldRequirementsUnverified,
} from './fieldRequirements'

export {
  LEGAL_KB,
  SUBCATEGORY_LEGAL_MAP,
  getLegalEntriesForSubcategory,
  getLegalReferences,
  legalKBIsStub,
} from './legalKB'
export type { LegalKBEntry } from './legalKB'

export {
  FINANCE_FRAUD_SUBCATEGORIES,
  SUBCATEGORY_LABEL,
  TOP_LEVEL_CATEGORY,
  OVERLAP_AREAS,
  OVERLAP_LABEL,
} from './types'
export type {
  ClassificationResult,
  ClassificationOverlap,
  OverlapArea,
  FinanceFraudSubCategory,
  FallbackCategory,
  LegalReference,
  FieldRequirement,
  SubCategoryFieldFile,
  CommonFieldFile,
  FieldRequirementsFile,
} from './types'
