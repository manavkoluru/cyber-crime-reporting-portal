export interface RequirementItem {
  id: string
  label: string
  description: string
}

export const COMPLAINT_REQUIREMENTS: Record<string, RequirementItem[]> = {
  UPI_FRAUD: [
    { id: 'location', label: 'PIN code or city', description: 'So we can route this to the right cyber police jurisdiction' },
    { id: 'proof', label: 'Screenshot or PDF of the transaction', description: 'UPI app screenshot, bank SMS, or statement showing the transaction' },
  ],
  PHISHING: [
    { id: 'location', label: 'PIN code or city', description: 'So we can route this to the right cyber police jurisdiction' },
    { id: 'proof', label: 'Screenshot of the phishing message', description: 'The SMS, email, or website that tricked you' },
  ],
  ECOMMERCE_SCAM: [
    { id: 'location', label: 'PIN code or city', description: 'So we can route this to the right cyber police jurisdiction' },
    { id: 'order_proof', label: 'Screenshot of the order/listing', description: 'Product page, order confirmation, or seller chat' },
    { id: 'payment_proof', label: 'Proof of payment', description: 'Screenshot or PDF showing the payment you made' },
  ],
  COMMERCIAL_DISPUTE: [
    { id: 'location', label: 'PIN code or city', description: 'So we can route this to the right cyber police jurisdiction' },
    { id: 'agreement_proof', label: 'Invoice, agreement, or order proof', description: 'Any document showing the terms of the deal' },
  ],
  UNKNOWN: [
    { id: 'location', label: 'PIN code or city', description: 'So we can route this to the right cyber police jurisdiction' },
    { id: 'proof', label: 'Any screenshot or document about the incident', description: 'Whatever evidence you have of what happened' },
  ],
}
