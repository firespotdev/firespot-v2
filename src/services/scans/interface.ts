export interface ScanCountResponse {
  count: number
}

export interface RecordCopyResponse {
  success: boolean
  message: string
}

export interface MerchantStatsResponse {
  totalScans: number
  scansThisWeek: number
  returningCustomers: number
}
