export interface BusinessLocation {
  id: string
  name: string
  address?: string
  location?: string
  isPrimary: boolean
}

export interface BusinessOpeningHours {
  useDifferentTimes: boolean
  timezone: string
  days: Array<{
    day: string
    enabled: boolean
    opensAt?: string
    closesAt?: string
    closesNextDay: boolean
  }>
}

export interface PublicBusinessProfile {
  id: string
  businessName: string
  merchantSlug?: string
  businessImageUrl?: string
  profileBannerUrl?: string
  businessIndustry?: string
  businessDescription?: string
  phoneNumber?: string
  mainAddress?: {
    state?: string
    city?: string
    address?: string
    market?: string
    shoppingComplex?: string
    shopNumber?: string
    landmark?: string
  }
  website?: string
  socialLinks: {
    instagram?: string
    facebook?: string
    whatsapp?: string
    tiktok?: string
    x?: string
  }
  openingHours?: BusinessOpeningHours | null
  verificationLevel?: 'PRO' | 'PROMAX' | null
  serialNumber?: string
  locations: BusinessLocation[]
  stats: {
    monthlyVisits: number
    favoriteCount: number
    averageSpend: number
    orderCount: number
    feedbackCount: number
    averageRating: number
  }
}

export interface PublicBusinessFeedback {
  id: string
  customerName: string
  customerPhotoUrl?: string
  rating: number
  comment: string
  createdAt: string
}

export interface PublicBusinessFeedbackResponse {
  data: PublicBusinessFeedback[]
  summary: {
    count: number
    averageRating: number
  }
  meta: {
    page: number
    lastPage: number
    total: number
  }
}
