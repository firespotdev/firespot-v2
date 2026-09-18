import type { CartItem } from '@/components/sales/types'

export interface CustomerActionMerchant {
  id: string
  businessName: string
  businessImageUrl?: string
  businessIndustry?: string
}

export interface CustomerCartDraft {
  id: string
  merchant: CustomerActionMerchant
  serialNumber: string
  items: Array<CartItem & { productId: string }>
  itemCount: number
  total: number
  updatedAt: string
  expiresAt: string
}

interface CustomerActionBase {
  id: string
  merchant: CustomerActionMerchant
  serialNumber: string
  amount?: number
  itemCount?: number
  createdAt: string
  expiresAt?: string
}

export interface ResumeCheckoutAction extends CustomerActionBase {
  type: 'resume_checkout'
  draftId: string
}

export interface CompletePaymentAction extends CustomerActionBase {
  type: 'complete_payment'
  saleId: string
}

export interface LeaveFeedbackAction extends CustomerActionBase {
  type: 'leave_feedback'
  saleId: string
}

export type CustomerAction =
  | ResumeCheckoutAction
  | CompletePaymentAction
  | LeaveFeedbackAction

export interface SaveCartDraftPayload {
  serialNumber: string
  items: Array<{
    productId: string
    quantity: number
    selectedVariant?: CartItem['selectedVariant']
  }>
}
