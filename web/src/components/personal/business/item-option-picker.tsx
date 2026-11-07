'use client'

import { cn } from '@/lib/utils'
import type {
  Product,
  ProductOptionValue,
} from '@/services/products/productsApi'

interface ItemOptionPickerProps {
  product: Product
  selected: Record<string, ProductOptionValue>
  isValueAvailable: (optionId: string, valueId: string) => boolean
  onSelect: (optionId: string, value: ProductOptionValue) => void
}

/** One row of choices per option (Size, Colour); unsellable values greyed. */
export function ItemOptionPicker({
  product,
  selected,
  isValueAvailable,
  onSelect,
}: ItemOptionPickerProps) {
  return (
    <div className="space-y-5">
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
                  onClick={() => onSelect(option.id, value)}
                  className={cn(
                    'min-h-11 min-w-20 rounded-[10px] border px-4 text-sm font-medium transition-colors',
                    isSelected
                      ? 'border-black bg-[#F7F8FA] text-black'
                      : isAvailable
                        ? 'border-[#D8DADF] bg-white text-[#111827]'
                        : 'cursor-not-allowed border-[#F1F1F1] bg-white text-[#D1D5DB]',
                  )}
                >
                  {value.value}
                </button>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
