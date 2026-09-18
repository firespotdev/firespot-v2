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
  businessImageUrl?: string
  profilePhotoUrl?: string
  businessIndustry?: string
  mainAddress?: CustomerSaleMerchant['mainAddress']
  verificationLevel?: CustomerSaleMerchant['verificationLevel']
} {
  const merchant = sale.merchantId
  if (merchant && typeof merchant === 'object') {
    const m = merchant as CustomerSaleMerchant
    return {
      id: m._id,
      businessName: m.businessName,
      merchantSlug: m.merchantSlug,
      businessImageUrl: m.businessImageUrl,
      profilePhotoUrl: m.profilePhotoUrl,
      businessIndustry: m.businessIndustry,
      mainAddress: m.mainAddress,
      verificationLevel: m.verificationLevel,
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

export function formatMerchantLocation(
  address?: CustomerSaleMerchant['mainAddress'],
): string {
  if (!address) return 'Visited in person'

  const parts = [address.market, address.city, address.state].filter(
    (part, index, values): part is string =>
      Boolean(part) && values.indexOf(part) === index,
  )

  return parts.slice(0, 2).join(', ') || address.address || 'Visited in person'
}
