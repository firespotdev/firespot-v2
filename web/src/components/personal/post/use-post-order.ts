'use client'

import { showNotificationToast } from '@/components/ui'
import { useAddToPurchase } from '@/hooks/use-add-to-purchase'
import { useDrawerStore } from '@/services/drawer'
import type { Product } from '@/services/products/productsApi'

/**
 * The order with the shop behind a post: how many items are in it, opening
 * "Your order", and Buy now for the post's items.
 */
export function usePostOrder(merchantId?: string, serialNumber?: string) {
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { cartItems, addSelection, addToPurchase } = useAddToPurchase(serialNumber)
  const itemCount = serialNumber ? cartItems.length : 0

  const openOrder = () => {
    if (!merchantId || !serialNumber) return
    openDrawer({
      type: 'order-summary',
      direction: 'bottom',
      props: { merchantId, serialNumber },
    })
  }

  /**
   * Adds the post's items to the order and opens it. Items with options are
   * picked one at a time, so Buy now asks for the first one's options.
   */
  const buyNow = (products: Product[]) => {
    if (!serialNumber || products.length === 0) return
    const simple = products.filter(
      (product) => product.options.length === 0 || product.variants.length === 0,
    )
    const withOptions = products.find((product) => !simple.includes(product))
    simple.forEach((product) => addSelection(product))
    if (withOptions) {
      addToPurchase(withOptions, 'Add to order')
      return
    }
    openOrder()
  }

  const addOne = (product: Product) => {
    addToPurchase(product)
    if (product.options.length === 0 || product.variants.length === 0) {
      showNotificationToast({
        message: `${product.name} added to your order`,
        mode: 'success',
      })
    }
  }

  return { itemCount, openOrder, buyNow, addOne }
}
