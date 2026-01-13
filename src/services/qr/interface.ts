export interface QRKit {
  _id: string
  serialNumber: string
  qrCodeSvgUrl?: string
  qrCodeSvgPublicId?: string
  activationStatus: 'pending' | 'activated' | 'deactivated'
  paymentStatus: 'pending' | 'successful' | 'failed'
  activationAmount: number
  merchantId?:
    | string
    | {
        _id: string
        phoneNumber?: string
        businessName?: string
        merchantSlug?: string
        bankAccounts?: any[]
      }
  createdAt: string
  updatedAt: string
}

export interface QRKitListResponse {
  data: QRKit[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface QRKitFilters {
  status?: string
  paymentStatus?: string
  search?: string
  page?: number
  limit?: number
}

export interface BulkCreateDto {
  quantity: number
}

export interface QRKitStats {
  total: number
  byActivationStatus: {
    pending: number
    activated: number
    deactivated: number
  }
  byPaymentStatus: {
    pending: number
    successful: number
    failed: number
  }
}

// Public merchant profile (returned when customer scans QR)
export interface MerchantProfile {
  id: string
  merchantSlug: string
  businessName: string
  bankAccounts: {
    bankName: string
    bankCode: string
    accountNumber: string
    accountName: string
    isPrimary: boolean
  }[]
  profilePhotoUrl?: string
}
