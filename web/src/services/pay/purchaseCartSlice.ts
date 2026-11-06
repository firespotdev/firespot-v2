import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem } from '@/components/sales/types'
import type { Product } from '@/services/products/productsApi'
import type { PaymentRail } from '@/components/custom-drawer/rail-picker-drawer'

interface PurchaseCartState {
  serialNumber: string
  amountDigits: string
  description: string
  begin: (serialNumber: string) => void
  setAmountDigits: (value: string) => void
  setDescription: (value: string) => void
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
  replaceItems: (items: CartItem[]) => void
  clear: () => void
  reset: () => void
}

export const usePurchaseCartStore = create<PurchaseCartState>()(
  persist(
    (set) => ({
      serialNumber: '',
      amountDigits: '',
      description: '',
      begin: (serialNumber) =>
        set((state) =>
          state.serialNumber === serialNumber
            ? {}
            : {
                serialNumber,
                items: [],
                amountDigits: '',
                description: '',
                selectedRail: 'multiple',
                selectedBankIndex: 0,
              },
        ),
      setAmountDigits: (amountDigits) => set({ amountDigits }),
      setDescription: (description) => set({ description }),
      items: [],
      selectedRail: 'multiple',
      selectedBankIndex: 0,
      addProduct: (product, selectedVariant, quantity = 1, variantPrice) =>
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
      replaceItems: (items) => set({ items }),
      clear: () => set({ items: [], amountDigits: '', description: '' }),
      reset: () =>
        set({
          items: [],
          amountDigits: '',
          description: '',
          selectedRail: 'multiple',
          selectedBankIndex: 0,
        }),
    }),
    {
      name: 'firespot-payment-draft',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
