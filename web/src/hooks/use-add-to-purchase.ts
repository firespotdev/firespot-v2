'use client'

import { useDrawerStore } from '@/services/drawer'
import { usePurchaseCartStore } from '@/services/pay/purchaseCartSlice'
import type { Product, ProductVariant } from '@/services/products/productsApi'
import type { CartItem } from '@/components/sales/types'

export type PurchaseVariant = {
  label: string
  values: Array<{
    optionId: string
    optionName: string
    valueId: string
    value: string
  }>
  price: number
}

/** Builds the cart's variant snapshot from a product's option combination. */
export function toPurchaseVariant(
  product: Product,
  variant: ProductVariant,
): PurchaseVariant {
  return {
    label: variant.label,
    price: variant.price,
    values: variant.values.map((value) => {
      const option = product.options.find((candidate) =>
        candidate.values.some((optionValue) => optionValue.id === value.id),
      )
      return {
        optionId: option?.id ?? '',
        optionName: option?.name ?? '',
        valueId: value.id,
        value: value.value,
      }
    }),
  }
}

/**
 * Adds products to the shared purchase cart that /pay/[serialNumber] checks
 * out. With a `serialNumber` (business profile, item details) the cart is
 * claimed for that merchant on first add, so browsing a profile never wipes
 * another merchant's cart. Without one (inside the pay page) the cart the
 * page already began is used as is.
 */
export function useAddToPurchase(serialNumber?: string) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const items = usePurchaseCartStore((state) => state.items)
  const cartSerialNumber = usePurchaseCartStore((state) => state.serialNumber)
  const addProduct = usePurchaseCartStore((state) => state.addProduct)
  const begin = usePurchaseCartStore((state) => state.begin)

  const cartItems: CartItem[] =
    !serialNumber || cartSerialNumber === serialNumber ? items : []

  const quantityForProduct = (productId: string) =>
    cartItems
      .filter((item) => item.id.startsWith(productId))
      .reduce((total, item) => total + item.quantity, 0)

  const addSelection = (
    product: Product,
    variant?: PurchaseVariant,
    quantity = 1,
  ) => {
    if (serialNumber) begin(serialNumber)
    addProduct(
      product,
      variant ? { label: variant.label, values: variant.values } : undefined,
      quantity,
      variant?.price,
    )
  }

  /** Adds one, asking for the option combination first when there is one. */
  const addToPurchase = (product: Product, actionLabel = 'Add to order') => {
    if (product.options.length === 0 || product.variants.length === 0) {
      addSelection(product)
      return
    }
    openDrawer({
      type: 'variant-selector',
      direction: 'bottom',
      props: {
        product,
        cartQuantity: quantityForProduct(product._id),
        actionLabel,
        onAdd: (variant: PurchaseVariant, quantity: number) =>
          addSelection(product, variant, quantity),
      },
    })
  }

  return { cartItems, quantityForProduct, addToPurchase, addSelection }
}
