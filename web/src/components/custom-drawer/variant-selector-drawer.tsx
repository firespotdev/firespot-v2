'use client'

import { useState } from 'react'
import { Image as ImageIcon, Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'
import type { Product } from '@/services/products/productsApi'
import { useVariantSelection } from '@/hooks/use-variant-selection'

interface Props {
  product: Product
  cartQuantity?: number
  actionLabel?: string
  onAdd: (
    variant: {
      label: string
      values: Array<{
        optionId: string
        optionName: string
        valueId: string
        value: string
      }>
      price: number
    },
    quantity: number,
  ) => void
}

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

export function VariantSelectorDrawer({
  product,
  cartQuantity = 0,
  actionLabel = 'Add to sale',
  onAdd,
}: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const { selected, variant, price, isValueAvailable, selectValue, purchaseVariant } =
    useVariantSelection(product)
  const [quantity, setQuantity] = useState(1)

  const addToSale = () => {
    if (!purchaseVariant) return
    onAdd(purchaseVariant, quantity)
    closeDrawer()
  }

  return (
    <div className="flex max-h-[80dvh] w-full max-w-125 flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-[#F1F1F1] px-4 py-2">
        <span className="w-9" aria-hidden="true" />
        <h2 className="text-[16px] font-bold">Select a variant</h2>
        <button
          type="button"
          onClick={() => closeDrawer()}
          aria-label="Close variant selector"
          className="grid p-1.5 place-items-center"
        >
          <X size={24} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex gap-3 border-b border-[#F1F1F1] px-4 py-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-[#F1F1F1]">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-[#9CA3AF]">
                <ImageIcon size={20} />
              </div>
            )}
            {cartQuantity > 0 && (
              <span className="absolute inset-0 grid place-items-center bg-black/45 text-[22px] font-bold text-white">
                {cartQuantity}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold">{product.name}</p>
            <p className="truncate text-sm font-medium text-[#6B7280]">
              {product.description || 'Custom item'}
            </p>
            <p className="mt-1 text-[14px] font-medium text-[#374151]">
              NGN {money(price)}
            </p>
          </div>
        </div>

        <div className="space-y-6 p-4">
          {product.options.map((option) => (
            <fieldset key={option.id}>
              <legend className="mb-2 text-sm font-medium text-[#647084]">
                {option.name}
              </legend>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => {
                  const isSelected = selected[option.id]?.id === value.id
                  const isAvailable = isValueAvailable(option.id, value.id)
                  return (
                    <button
                      key={value.id}
                      type="button"
                      disabled={!isAvailable}
                      aria-pressed={isSelected}
                      onClick={() => selectValue(option.id, value)}
                      className={`min-h-11 rounded-[10px] border px-4 text-sm font-medium transition-colors ${
                        isSelected
                          ? 'border-black bg-[#F7F8FA] text-black'
                          : isAvailable
                            ? 'border-[#D8DADF] bg-white text-[#111827]'
                            : 'cursor-not-allowed border-[#F1F1F1] bg-white text-[#D1D5DB]'
                      }`}
                    >
                      {value.value}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-[#F1F1F1] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex h-10 items-center rounded-[10px] bg-[#F1F1F1]">
          <button
            type="button"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            disabled={quantity === 1}
            aria-label="Decrease quantity"
            className="grid h-11 w-11 place-items-center disabled:opacity-40"
          >
            <Minus size={16} />
          </button>
          <span className="min-w-8 text-center text-[16px] font-bold">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((current) => current + 1)}
            aria-label="Increase quantity"
            className="grid h-11 w-11 place-items-center"
          >
            <Plus size={16} />
          </button>
        </div>
        <Button
          type="button"
          disabled={!variant}
          onClick={addToSale}
          className="h-11 w-auto px-7"
        >
          {actionLabel}
        </Button>
      </footer>
    </div>
  )
}
