'use client'

import { useMemo, useState } from 'react'
import { Image as ImageIcon, Minus, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'
import type {
  Product,
  ProductOptionValue,
  ProductVariant,
} from '@/services/products/productsApi'

interface Props {
  product: Product
  cartQuantity?: number
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

const selectionFromVariant = (product: Product, variant: ProductVariant) =>
  Object.fromEntries(
    product.options.flatMap((option) => {
      const value = option.values.find((entry) =>
        variant.optionValueIds.includes(entry.id),
      )
      return value ? [[option.id, value]] : []
    }),
  ) as Record<string, ProductOptionValue>

export function VariantSelectorDrawer({
  product,
  cartQuantity = 0,
  onAdd,
}: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const firstVariant = product.variants[0]
  const [selected, setSelected] = useState<
    Record<string, ProductOptionValue>
  >(() =>
    firstVariant
      ? selectionFromVariant(product, firstVariant)
      : Object.fromEntries(
          product.options.flatMap((option) =>
            option.values[0] ? [[option.id, option.values[0]]] : [],
          ),
        ),
  )
  const [quantity, setQuantity] = useState(1)

  const selectedIds = useMemo(
    () => Object.values(selected).map((value) => value.id),
    [selected],
  )
  const variant = useMemo(
    () =>
      product.variants.find(
        (entry) =>
          entry.optionValueIds.length === selectedIds.length &&
          entry.optionValueIds.every((id) => selectedIds.includes(id)),
      ),
    [product.variants, selectedIds],
  )
  const price = variant?.price ?? product.price

  const isValueAvailable = (optionId: string, valueId: string) => {
    const otherSelectedIds = product.options
      .filter((option) => option.id !== optionId)
      .map((option) => selected[option.id]?.id)
      .filter(Boolean)
    return product.variants.some(
      (entry) =>
        entry.optionValueIds.includes(valueId) &&
        otherSelectedIds.every((id) => entry.optionValueIds.includes(id)),
    )
  }

  const selectValue = (optionId: string, value: ProductOptionValue) => {
    const next = { ...selected, [optionId]: value }
    const nextIds = Object.values(next).map((entry) => entry.id)
    const exactVariant = product.variants.find(
      (entry) =>
        entry.optionValueIds.length === nextIds.length &&
        entry.optionValueIds.every((id) => nextIds.includes(id)),
    )
    if (exactVariant) {
      setSelected(next)
      return
    }

    const compatibleVariant = product.variants.find((entry) =>
      entry.optionValueIds.includes(value.id),
    )
    if (compatibleVariant) {
      setSelected(selectionFromVariant(product, compatibleVariant))
    }
  }

  const addToSale = () => {
    if (!variant) return
    onAdd(
      {
        label: variant.label,
        values: product.options.map((option) => ({
          optionId: option.id,
          optionName: option.name,
          valueId: selected[option.id].id,
          value: selected[option.id].value,
        })),
        price,
      },
      quantity,
    )
    closeDrawer()
  }

  return (
    <div className="flex max-h-[80dvh] w-full max-w-125 flex-col bg-white font-satoshi">
      <header className="flex shrink-0 items-center justify-between border-b border-[#F1F1F1] px-4 py-3">
        <span className="w-9" aria-hidden="true" />
        <h2 className="text-[16px] font-bold">Select a variant</h2>
        <button
          type="button"
          onClick={() => closeDrawer()}
          aria-label="Close variant selector"
          className="grid h-9 w-9 place-items-center"
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
              {product.description || 'Premium item'}
            </p>
            <p className="mt-1 text-[14px] font-medium text-[#374151]">
              NGN {money(price)}
            </p>
          </div>
        </div>

        <div className="space-y-6 px-4 py-5">
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
        <div className="flex h-11 items-center rounded-[12px] bg-[#F1F1F1]">
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
          Add to sale
        </Button>
      </footer>
    </div>
  )
}
