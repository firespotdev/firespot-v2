'use client'

import { useState } from 'react'
import { X, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'

interface Props {
  product: any
  onAdd: (size: string, color: string, quantity: number) => void
}

export function VariantSelectorDrawer({ product, onAdd }: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const [selectedSize, setSelectedSize] = useState(
    product.variants?.[0]?.size || '',
  )
  const [selectedColor, setSelectedColor] = useState(
    product.variants?.[0]?.color || '',
  )
  const [quantity, setQuantity] = useState(1)

  const sizes = Array.from(
    new Set(product.variants?.map((v: any) => v.size).filter(Boolean) || []),
  ) as string[]
  const colors = Array.from(
    new Set(product.variants?.map((v: any) => v.color).filter(Boolean) || []),
  ) as string[]

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)
  }

  return (
    <div className="w-full flex flex-col font-satoshi p-6 bg-white max-w-125 mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-5 shrink-0">
        <h2 className="text-base font-bold text-black">Select a variant</h2>
        <button
          onClick={closeDrawer}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-all flex items-center justify-center"
        >
          <X className="w-5 h-5 text-[#8E8E93]" />
        </button>
      </div>

      {/* Product Summary Card */}
      <div className="flex items-center gap-3.5 p-4 bg-[#F4F6F8] rounded-4xl mb-5 text-left border border-[#E9EBED]">
        <div className="relative w-14 h-14 bg-white rounded-[10px] flex items-center justify-center text-gray-400 shrink-0 overflow-hidden border border-[#E9EBED]">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 border-2 border-gray-300 rounded" />
          )}
          {quantity > 1 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-sm">
              {quantity}
            </div>
          )}
        </div>
        <div className="flex flex-col text-left justify-center">
          <span className="text-sm font-bold text-black leading-tight">
            {product.name}
          </span>
          <span className="text-xs text-[#00000060] mt-1">
            {product.description || 'Premium product item'}
          </span>
          <span className="text-sm font-bold text-black mt-1.5">
            NGN {formatCurrency(product.price)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-5 text-left">
        {/* Sizes */}
        {sizes.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-[#8E8E93] font-bold tracking-wider uppercase">
              Size
            </span>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size: string) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
                    selectedSize === size
                      ? 'border-black bg-white text-black shadow-sm'
                      : 'border-[#E9EBED] bg-white text-black hover:border-gray-400 font-medium'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Colours */}
        {colors.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs text-[#8E8E93] font-bold tracking-wider uppercase">
              Colour
            </span>
            <div className="flex flex-wrap gap-2">
              {colors.map((color: string) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`px-4 py-2 border rounded-xl text-xs font-bold transition-all ${
                    selectedColor === color
                      ? 'border-black bg-white text-black shadow-sm'
                      : 'border-[#E9EBED] bg-white text-black hover:border-gray-400 font-medium'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom row: quantity selector + record button */}
        <div className="flex justify-between items-center mt-3 border-t border-[#F4F6F8] pt-4">
          <div className="flex items-center bg-[#F4F6F8] rounded-xl px-2 py-1 h-12 border border-[#E9EBED]">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 h-full text-black hover:opacity-70 transition-opacity flex items-center justify-center"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3px]" />
            </button>
            <span className="text-sm font-bold text-black px-1 min-w-[20px] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="px-3 h-full text-black hover:opacity-70 transition-opacity flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3px]" />
            </button>
          </div>

          <Button
            onClick={() => {
              onAdd(selectedSize, selectedColor, quantity)
              closeDrawer()
            }}
            className="h-12 bg-black hover:bg-black/90 text-white font-bold rounded-full px-8 text-sm tracking-[0.2px] transition-all"
          >
            Add to sale
          </Button>
        </div>
      </div>
    </div>
  )
}
