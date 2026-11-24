import type { Product } from '@/services/products/productsApi'
import { formatCurrency } from '@/lib/utils'

export interface ProductPricing {
  /** The price to show: the base price, or the cheapest option when sizes differ. */
  price: number
  /** Options sell at different prices, so `price` is a "from" price. */
  isFromPrice: boolean
  /** Original price to strike through. Discounts apply to the base price only. */
  compareAtPrice: number | null
}

export function getProductPricing(product: Product): ProductPricing {
  const optionPrices = (product.variants ?? []).map((variant) => variant.price)
  const isFromPrice = optionPrices.some((price) => price !== product.price)
  const hasDiscount =
    !isFromPrice &&
    typeof product.compareAtPrice === 'number' &&
    product.compareAtPrice > product.price

  return {
    // Only sellable combinations count; the base price may match none of them.
    price: isFromPrice ? Math.min(...optionPrices) : product.price,
    isFromPrice,
    compareAtPrice: hasDiscount ? product.compareAtPrice! : null,
  }
}

/** Whole naira without decimals ("13,000"); kobo amounts keep two places. */
export function formatProductPrice(value: number): string {
  return value % 1 === 0
    ? new Intl.NumberFormat('en-NG').format(value)
    : formatCurrency(value)
}
