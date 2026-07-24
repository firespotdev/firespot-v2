export interface QRKit {
  _id: string
  serialNumber: string
  qrCodeSvgUrl?: string
  qrCodeSvgPublicId?: string
  activationStatus: 'pending' | 'activated' | 'deactivated'
  paymentStatus: 'pending' | 'successful' | 'failed'
  activationAmount: number
  isDigital: boolean
  linkStatus?: 'linked' | 'unlinked'
  source?: 'self-generated' | 'admin-generated' | 'online-order'
  merchantId?:
    | string
    | {
        _id: string
        phoneNumber?: string
        businessName?: string
        merchantSlug?: string
        bankAccounts?: unknown[]
        profilePhotoUrl?: string
      }
  agentId?:
    | string
    | {
        _id: string
        agentId: string
        name: string
        phoneNumber: string
        state?: string
        lga?: string
        bustop?: string
      }
  assignedToAgentAt?: string
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
  agentId?: string
  unassigned?: boolean
  page?: number
  limit?: number
}

export interface CreateQRKitDto {
  agentId?: string
}

export interface BulkCreateDto {
  quantity: number
  agentId?: string
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
