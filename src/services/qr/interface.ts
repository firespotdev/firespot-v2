export interface QRKit {
  _id: string
  serialNumber: string
  qrCodeSvgUrl?: string
  qrCodeSvgPublicId?: string
  activationStatus: 'pending' | 'activated' | 'deactivated'
  paymentStatus: 'pending' | 'successful' | 'failed'
  activationAmount: number
  merchantId?: string
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
