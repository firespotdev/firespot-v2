export interface DiscoveryMeta {
  page: number
  limit: number
  total: number
  lastPage: number
}

export interface DiscoveredMerchant {
  id: string
  businessName: string
  merchantSlug?: string
  businessImageUrl?: string
  businessIndustry?: string
  state?: string
  city?: string
  serialNumber: string
}

export interface DiscoveredProduct {
  id: string
  name: string
  description?: string
  price: number
  imageUrl?: string
  merchant: DiscoveredMerchant
}

export interface DiscoveryResponse<T> {
  data: T[]
  meta: DiscoveryMeta
}

export interface DiscoveryParams {
  search?: string
  page?: number
  limit?: number
}
