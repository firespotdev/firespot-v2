import type {
  CustomerSale,
  CustomerSaleMerchant,
} from '@/services/sales/interface'

/**
 * A sale from the customer's activity feed carries its merchant either
 * populated (object) or as a bare id string. Normalise to a consistent shape.
 */
export function resolveSaleMerchant(sale: CustomerSale): {
  id?: string
  businessName?: string
  merchantSlug?: string
  profilePhotoUrl?: string
  businessIndustry?: string
} {
  const merchant = sale.merchantId
  if (merchant && typeof merchant === 'object') {
    const m = merchant as CustomerSaleMerchant
    return {
      id: m._id,
      businessName: m.businessName,
      merchantSlug: m.merchantSlug,
      profilePhotoUrl: m.profilePhotoUrl,
      businessIndustry: m.businessIndustry,
    }
  }
  return { id: typeof merchant === 'string' ? merchant : undefined }
}

/** Number of distinct line items on a sale (0 when none). */
export function saleItemCount(sale: CustomerSale): number {
  return sale.items?.length || 0
}

/**
 * Feed subtitle mirroring the design's "You paid for a purchase" /
 * "You ordered items" copy. We only have payment data, so it's derived from
 * whether the sale carries line items.
 */
export function saleActivitySubtitle(sale: CustomerSale): string {
  return saleItemCount(sale) > 0 ? 'You ordered items' : 'You paid for a purchase'
}
