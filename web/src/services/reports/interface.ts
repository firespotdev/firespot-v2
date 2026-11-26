export type ReportCategory =
  | 'item_not_received'
  | 'item_damaged'
  | 'not_as_described'
  | 'wrong_items'
  | 'merchant_unresponsive'

export type ReportStatus = 'pending' | 'in_review' | 'resolved' | 'closed'
export type ReportDecision = 'customer' | 'merchant'

/** The categories, in the order the picker shows them. */
export const REPORT_CATEGORIES: ReadonlyArray<{
  value: ReportCategory
  label: string
}> = [
  { value: 'item_not_received', label: 'Item not received' },
  { value: 'item_damaged', label: 'Item arrived damaged' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'wrong_items', label: 'Wrong items received' },
  { value: 'merchant_unresponsive', label: 'Merchant unresponsive' },
]

export const REPORT_DESCRIPTION_MAX = 160

export const reportCategoryLabel = (value: string) =>
  REPORT_CATEGORIES.find((category) => category.value === value)?.label ??
  value

/** The sale a report is about, as the report screens show it. */
export interface ReportSale {
  _id: string
  amount: number
  status: string
  reference?: string
  date: string
  itemCount: number
  merchant: { _id: string; businessName?: string; imageUrl?: string }
}

export interface ReportSaleContext {
  sale: ReportSale
  openReport: { _id: string; status: ReportStatus } | null
  canReport: boolean
}

export interface ReportDetails {
  _id: string
  category: string
  description: string
  proofUrl?: string
  status: ReportStatus
  decision?: ReportDecision
  resolutionNote?: string
  resolvedAt?: string
  closedAt?: string
  createdAt: string
  followUpCount: number
  nextFollowUpAt: string | null
  sale: ReportSale | null
}

export interface CreateReportPayload {
  saleId: string
  category: ReportCategory
  description: string
  proof?: File
}
