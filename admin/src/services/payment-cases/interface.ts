export interface PopulatedMerchant {
  _id: string
  businessName?: string
  fullPhoneNumber?: string
}

export interface PopulatedSale {
  _id: string
  reference?: string
  paystackReference?: string
  amount?: number
  description?: string
  recordedAt?: string
}

export interface RefundCase {
  _id: string
  merchantId: PopulatedMerchant
  saleId: PopulatedSale
  transactionReference: string
  amountKobo: number
  currency: string
  status: string
  approvalRequired: boolean
  customerNote?: string
  merchantNote?: string
  expectedAt?: string
  createdAt: string
}

export interface DisputeEvidence {
  evidenceId?: number
  filename?: string
  description?: string
  url?: string
  uploadedAt: string
}

export interface DisputeCase {
  _id: string
  paystackDisputeId: number
  merchantId?: PopulatedMerchant
  saleId?: PopulatedSale
  transactionReference?: string
  amountKobo: number
  refundAmountKobo: number
  currency: string
  status: string
  category?: string
  resolution?: string
  dueAt?: string
  adminAcceptanceAvailableAt?: string
  evidence: DisputeEvidence[]
  internalNotes: Array<{ adminId: string; note: string; at: string }>
  createdAt: string
}

export interface CustomerReport {
  _id: string
  merchantId: PopulatedMerchant
  customerId?: {
    _id: string
    firstName?: string
    lastName?: string
    fullPhoneNumber?: string
  }
  saleId: PopulatedSale
  category: string
  description: string
  proofUrl?: string
  status: 'pending' | 'in_review' | 'resolved'
  createdAt: string
}

