import { IDARaw } from './ida'

export interface RouteDecision {
  route_to: 'FILE_COMPLAINT_AGENT' | 'RETRIEVAL_AGENT' | 'FALLBACK_AGENT' | 'IDA'
  priority: 'URGENT' | 'NORMAL'
  reason: string
  context_passed: Record<string, unknown>
}

export async function runRouter(idaResult: IDARaw): Promise<RouteDecision> {
  const { extracted, confidence, missing_critical_fields } = idaResult

  if (!extracted) {
    return {
      route_to: 'FALLBACK_AGENT',
      priority: 'NORMAL',
      reason: 'No extraction result from IDA',
      context_passed: idaResult.extracted || {},
    }
  }

  if (extracted.attachment_relevant === false) {
    return {
      route_to: 'IDA',
      priority: 'NORMAL',
      reason: 'Uploaded attachment does not contain fraud or transaction evidence',
      context_passed: extracted,
    }
  }

  const { intent, fraud_category, golden_hour_active, utr_or_transaction_id, amount_stolen, destination_vpa_or_account } = extracted
  const missingCount = (missing_critical_fields || []).length

  // Check if we have mandatory fields (regardless of intent classification)
  const hasMandatoryFields = !!(utr_or_transaction_id && amount_stolen && destination_vpa_or_account)

  // If fraud detected with all mandatory fields → go to FILE_COMPLAINT
  if ((intent === 'FILE_COMPLAINT' || (intent === 'AMBIGUOUS' && hasMandatoryFields)) && hasMandatoryFields) {
    const isConsumerCase = ['ECOMMERCE_SCAM', 'COMMERCIAL_DISPUTE'].includes(fraud_category)
    return {
      route_to: 'FILE_COMPLAINT_AGENT',
      priority: golden_hour_active && !isConsumerCase ? 'URGENT' : 'NORMAL',
      reason: `${fraud_category} – all mandatory fields present, ready to file`,
      context_passed: extracted,
    }
  }

  // Not enough info yet – keep gathering (but only if ambiguous/low confidence)
  if (confidence! < 0.55 && missingCount > 1 && !hasMandatoryFields) {
    return {
      route_to: 'IDA',
      priority: 'NORMAL',
      reason: 'Insufficient confidence – collecting more context',
      context_passed: extracted,
    }
  }

  // File Complaint routing (explicit intent)
  if (intent === 'FILE_COMPLAINT') {
    const isConsumerCase = ['ECOMMERCE_SCAM', 'COMMERCIAL_DISPUTE'].includes(fraud_category)
    return {
      route_to: 'FILE_COMPLAINT_AGENT',
      priority: golden_hour_active && !isConsumerCase ? 'URGENT' : 'NORMAL',
      reason: `${fraud_category} – complaint filing requested`,
      context_passed: extracted,
    }
  }

  // Check Status routing
  if (intent === 'CHECK_STATUS') {
    return {
      route_to: 'RETRIEVAL_AGENT',
      priority: 'NORMAL',
      reason: 'User wants to check complaint status',
      context_passed: extracted,
    }
  }

  // General info – fallback handles it
  if (intent === 'GENERAL_INFO' && confidence! >= 0.6) {
    return {
      route_to: 'FALLBACK_AGENT',
      priority: 'NORMAL',
      reason: 'General information query',
      context_passed: extracted,
    }
  }

  // Low confidence or ambiguous – fallback (warm conversation)
  return {
    route_to: 'FALLBACK_AGENT',
    priority: 'NORMAL',
    reason: 'Low confidence or ambiguous intent',
    context_passed: extracted,
  }
}
