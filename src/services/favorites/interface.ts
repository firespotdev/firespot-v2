export interface FavoriteMerchant {
  id: string
  businessName?: string
  merchantSlug?: string
  profilePhotoUrl?: string
  businessIndustry?: string
}

export interface FavoritesResponse {
  favorites: FavoriteMerchant[]
}
