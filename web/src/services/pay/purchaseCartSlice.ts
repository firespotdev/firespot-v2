import { create } from 'zustand'
import type { CartItem } from '@/components/sales/types'
import type { Product } from '@/services/products/productsApi'
import type { PaymentRail } from '@/components/custom-drawer/rail-picker-drawer'

interface PurchaseCartState {
  items: CartItem[]
  selectedRail: PaymentRail
  selectedBankIndex: number
  addProduct: (
    product: Product,
    selectedVariant?: CartItem['selectedVariant'],
    quantity?: number,
    variantPrice?: number,
  ) => void
  updateQuantity: (id: string, delta: number) => void
  setSelectedRail: (rail: PaymentRail) => void
  setSelectedBankIndex: (index: number) => void
  clear: () => void
  reset: () => void
}

export const usePurchaseCartStore = create<PurchaseCartState>((set) => ({
  items: [],
  selectedRail: 'multiple',
  selectedBankIndex: 0,
  addProduct: (
    product,
    selectedVariant,
    quantity = 1,
    variantPrice,
  ) =>
    set((state) => {
      const variantId =
        selectedVariant?.values
          ?.map((value) => value.valueId)
          .filter(Boolean)
          .join('-') || ''
      const id = `${product._id}-${variantId}`
      const existing = state.items.find((item) => item.id === id)
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          ),
        }
      }

      return {
        items: [
          ...state.items,
          {
            id,
            name: product.name,
            description: product.description,
            imageUrl: product.imageUrl,
            price: variantPrice ?? product.price,
            quantity,
            selectedVariant,
          },
        ],
      }
    }),
  updateQuantity: (id, delta) =>
    set((state) => ({
      items: state.items
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    })),
  setSelectedRail: (selectedRail) => set({ selectedRail }),
  setSelectedBankIndex: (selectedBankIndex) => set({ selectedBankIndex }),
  clear: () => set({ items: [] }),
  reset: () =>
    set({ items: [], selectedRail: 'multiple', selectedBankIndex: 0 }),
}))
