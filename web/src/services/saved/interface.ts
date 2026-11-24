import type { MerchantPost } from '@/services/posts'
import type { Product } from '@/services/products/productsApi'

/** A saved item with the shop that sells it; orders go through its serial. */
export interface SavedItem {
  product: Product
  merchant: { id: string; businessName?: string; serialNumber: string }
}

export interface SavedItemsResponse {
  items: SavedItem[]
}

export interface SavedPostsResponse {
  posts: MerchantPost[]
}
