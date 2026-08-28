/**
 * Typed loader for field-requirements.json.
 *
 * The JSON is the source of truth (easy to diff against the live NCRP form).
 * This module just gives it types and small accessors.
 */

import raw from './field-requirements.json'
import type {
  CommonFieldFile,
  FieldRequirementsFile,
  FinanceFraudSubCategory,
  SubCategoryFieldFile,
} from './types'

const data = raw as unknown as FieldRequirementsFile & { _comment?: string }

export const FIELD_REQUIREMENTS: FieldRequirementsFile = {
  verifiedAgainstPortalOn: data.verifiedAgainstPortalOn,
  source: data.source,
  common: data.common,
  subCategories: data.subCategories,
}

export function getCommonFields(): CommonFieldFile {
  return FIELD_REQUIREMENTS.common
}

export function getSubCategoryFieldFile(
  subCategory: FinanceFraudSubCategory
): SubCategoryFieldFile {
  const file = FIELD_REQUIREMENTS.subCategories[subCategory]
  if (!file) {
    throw new Error(`No field-requirements entry for sub-category "${subCategory}"`)
  }
  return file
}

/** The full field file the filing module consumes: per-category + shared common block. */
export function getFieldFileForFiling(
  subCategory: FinanceFraudSubCategory
): SubCategoryFieldFile & { common: CommonFieldFile } {
  return {
    ...getSubCategoryFieldFile(subCategory),
    common: getCommonFields(),
  }
}

/** True until the field lists have been checked against the live portal form. */
export function fieldRequirementsUnverified(): boolean {
  return !FIELD_REQUIREMENTS.verifiedAgainstPortalOn
}
