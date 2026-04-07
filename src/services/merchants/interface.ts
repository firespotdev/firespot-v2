export interface MerchantStats {
  total: number
  newToday: number
  newThisWeek: number
  newThisMonth: number
  active: number
  inactive: number
  activationRate: number
}

export interface BankAccount {
  bankCode: string
  bankName: string
  accountNumber: string
  accountName: string
}

export interface Merchant {
  _id: string
  phoneNumber: string
  phoneCountryCode: string
  fullPhoneNumber: string
  businessName?: string
  merchantSlug?: string
  bankAccounts?: BankAccount[]
  profilePhotoUrl?: string
  referredByAgent?: string
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  isActive: boolean
}

export interface MerchantWithDetails extends Merchant {
  qrKits: Array<{
    _id: string
    serialNumber: string
    activationStatus: string
    paymentStatus: string
    activatedAt?: string
    createdAt: string
  }>
  qrKitCount: number
  activatedQrKitCount: number
}

export interface MerchantListResponse {
  data: Merchant[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface MerchantFilters {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive'
}

export interface PendingQROrder {
  _id: string
  quantity: number
  totalAmount: number
  deliveryAddress: string
  createdAt: string
}

export interface MerchantSpecificStats {
  scans: number
  uniqueCustomers: number
  sales: {
    confirmedAmount: number
    confirmedCount: number
    pendingCount: number
  }
  qrKits: number
  pendingOrders: PendingQROrder[]
  dateRange: {
    startDate: string | null
    endDate: string | null
    preset: string
  }
}
