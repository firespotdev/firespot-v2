export interface MerchantFeedback {
  _id: string
  saleId: string
  qrKitId: string
  customerName: string
  customerPhotoUrl?: string
  rating: number
  comment: string
  createdAt: string
}

export interface FeedbackListResponse {
  data: MerchantFeedback[]
  summary: {
    count: number
    averageRating: number
  }
  meta: {
    page: number
    lastPage: number
    total: number
  }
}

export interface FeedbackEligibility {
  eligible: boolean
  reason: 'not_eligible' | 'submitted' | 'disabled' | null
}

export interface CreateFeedbackPayload {
  saleId: string
  serialNumber: string
  rating: number
  comment: string
}
