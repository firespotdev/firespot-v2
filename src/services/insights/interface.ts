export type DateRangePreset =
  | 'all_time'
  | 'today'
  | 'this_week'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'custom'

export interface InsightsQuery {
  preset?: DateRangePreset
  startDate?: string
  endDate?: string
}

export interface QRKitScanBreakdown {
  qrKitId: string
  serialNumber: string
  scanCount: number
}

export interface BankBreakdown {
  bankName: string
  count: number
}

export interface CustomerBreakdown {
  newCustomers: number
  returningCustomers: number
  totalCustomers: number
}

export interface PaymentMethodBreakdown {
  method: string
  count: number
}

export interface MerchantInsightsResponse {
  traffic: {
    totalCustomers: number
    customerBreakdown: CustomerBreakdown
  }
  qrKitScans: {
    totalScans: number
    breakdown: QRKitScanBreakdown[]
  }
  accountCopies: {
    totalCopies: number
    bankBreakdown: BankBreakdown[]
  }
  paymentMethods: {
    totalSales: number
    breakdown: PaymentMethodBreakdown[]
  }
  linkedCounts: {
    bankAccounts: number
    qrKits: number
  }
  dateRange: {
    startDate: string | null
    endDate: string | null
    preset: string
  }
}

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  all_time: 'All time',
  today: 'Today',
  this_week: 'This week',
  last_7_days: 'Last 7 days',
  last_30_days: 'Last 30 days',
  last_90_days: 'Last 90 days',
  custom: 'Custom',
}
