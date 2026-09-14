export interface FavoriteMerchant {
  id: string
  businessName?: string
  merchantSlug?: string
  businessImageUrl?: string
  profilePhotoUrl?: string
  businessIndustry?: string
}

export interface FavoritesResponse {
  favorites: FavoriteMerchant[]
}
