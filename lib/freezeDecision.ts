// Account freezing decision logic
// Input: complaint details
// Output: action (INSTANT_FREEZE, ESCALATE_TO_POLICE, MANUAL_REVIEW)

export interface FreezeDecisionInput {
  confidenceScore: number // 0-1
  amountInRupees: number
  isGoldenHour: boolean // < 2 hours
  currentHour: number // 0-23
  fraudCategory: string
}

export interface FreezeDecisionOutput {
  action: 'INSTANT_FREEZE' | 'ESCALATE_TO_POLICE' | 'MANUAL_REVIEW'
  reason: string
  frozenAccounts: string[] // accounts to freeze
  urgency: 'CRITICAL' | 'HIGH' | 'NORMAL'
  estimatedTimeToAction: string // e.g., "Immediate", "5 minutes", "30 minutes"
}

export function decideFreezeAction(input: FreezeDecisionInput): FreezeDecisionOutput {
  const { confidenceScore, amountInRupees, isGoldenHour, currentHour, fraudCategory } = input

  // High confidence + golden hour + significant amount → INSTANT FREEZE
  if (confidenceScore >= 0.8 && isGoldenHour && amountInRupees > 10000) {
    return {
      action: 'INSTANT_FREEZE',
      reason: `High confidence fraud (${(confidenceScore * 100).toFixed(0)}%) in Golden Hour with ₹${amountInRupees} loss. Immediate action required.`,
      frozenAccounts: [], // To be populated by caller with actual UPIs
      urgency: 'CRITICAL',
      estimatedTimeToAction: 'Immediate (< 1 minute)',
    }
  }

  // Off-hours (night 22:00-06:00) + high confidence → INTELLIGENT AUTO-FREEZE
  const isNightTime = currentHour >= 22 || currentHour < 6
  if (isNightTime && confidenceScore >= 0.75 && amountInRupees > 5000) {
    return {
      action: 'INSTANT_FREEZE',
      reason: `Off-hours fraud alert (${currentHour}:00). High confidence (${(confidenceScore * 100).toFixed(0)}%) detected during night time. Auto-freezing to prevent further loss.`,
      frozenAccounts: [],
      urgency: 'CRITICAL',
      estimatedTimeToAction: 'Immediate (< 30 seconds)',
    }
  }

  // Medium confidence + golden hour → ESCALATE to assigned police
  if (confidenceScore >= 0.6 && isGoldenHour && amountInRupees > 5000) {
    return {
      action: 'ESCALATE_TO_POLICE',
      reason: `Medium-high confidence (${(confidenceScore * 100).toFixed(0)}%) in Golden Hour. Assigned police to decide on account freeze.`,
      frozenAccounts: [],
      urgency: 'HIGH',
      estimatedTimeToAction: '5-10 minutes (pending police approval)',
    }
  }

  // High amount but lower confidence → MANUAL REVIEW
  if (confidenceScore < 0.6 && amountInRupees > 20000) {
    return {
      action: 'MANUAL_REVIEW',
      reason: `High amount (₹${amountInRupees}) but moderate confidence (${(confidenceScore * 100).toFixed(0)}%). Requires human verification before freeze.`,
      frozenAccounts: [],
      urgency: 'HIGH',
      estimatedTimeToAction: '15-30 minutes (admin review)',
    }
  }

  // Low confidence, lower amount → MANUAL REVIEW
  if (confidenceScore < 0.55) {
    return {
      action: 'MANUAL_REVIEW',
      reason: `Lower confidence score (${(confidenceScore * 100).toFixed(0)}%). Complaint filed but requires clarification from complainant.`,
      frozenAccounts: [],
      urgency: 'NORMAL',
      estimatedTimeToAction: '30-60 minutes (standard review)',
    }
  }

  // Medium confidence, reasonable amount → ESCALATE
  return {
    action: 'ESCALATE_TO_POLICE',
    reason: `Standard ${fraudCategory} case with confidence ${(confidenceScore * 100).toFixed(0)}%. Police to assess and freeze accounts.`,
    frozenAccounts: [],
    urgency: 'NORMAL',
    estimatedTimeToAction: '10-30 minutes (police decision)',
  }
}

// Escalation logic: if police don't respond within timeout
export function checkEscalation(
  status: string,
  filedAt: Date,
  assignedPoliceId?: string,
  amountInRupees?: number
): {
  shouldEscalate: boolean
  escalateTo: string
  reason: string
} {
  const nowMs = Date.now()
  const filedAtMs = filedAt.getTime()
  const elapsedMinutes = (nowMs - filedAtMs) / (1000 * 60)

  // If pending clarification and > 10 min → escalate to admin
  if (status === 'PENDING_CLARIFICATION' && elapsedMinutes > 10) {
    return {
      shouldEscalate: true,
      escalateTo: 'ADMIN',
      reason: 'Complaint pending clarification for >10 minutes. Escalating to admin for follow-up.',
    }
  }

  // If under investigation and > 30 min (high amount) → escalate
  if (status === 'UNDER_INVESTIGATION' && amountInRupees && amountInRupees > 50000 && elapsedMinutes > 30) {
    return {
      shouldEscalate: true,
      escalateTo: 'ADMIN',
      reason: 'High-value complaint (₹' + amountInRupees + ') under investigation for >30 min. Escalating to admin.',
    }
  }

  // If assigned to police and no response for > 1 hour → escalate to admin
  if (assignedPoliceId && status === 'UNDER_INVESTIGATION' && elapsedMinutes > 60) {
    return {
      shouldEscalate: true,
      escalateTo: 'ADMIN',
      reason: 'Assigned police no response for >1 hour. Escalating to city admin.',
    }
  }

  return {
    shouldEscalate: false,
    escalateTo: '',
    reason: '',
  }
}
