export interface QRKit {
  _id: string
  serialNumber: string
  qrCodeSvgUrl?: string
  qrCodeSvgPublicId?: string
  activationStatus: string
  paymentStatus: string
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
