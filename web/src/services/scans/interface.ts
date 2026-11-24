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

/** A business the signed-in customer scanned recently. */
export interface RecentScan {
  merchant: {
    _id: string
    businessName?: string
    merchantSlug?: string
    businessImageUrl?: string
    mainAddress?: {
      state?: string
      city?: string
      address?: string
      market?: string
    }
    verificationLevel: 'PRO' | 'PROMAX' | null
  }
  lastScannedAt: string
}
