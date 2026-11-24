export interface FavoriteMerchant {
  id: string
  businessName?: string
  merchantSlug?: string
  businessImageUrl?: string
  profilePhotoUrl?: string
  businessIndustry?: string
  verificationLevel?: 'PRO' | 'PROMAX' | null
}

export interface FavoritesResponse {
  favorites: FavoriteMerchant[]
}
