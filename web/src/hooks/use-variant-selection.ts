'use client'

import { useMemo, useState } from 'react'
import type {
  Product,
  ProductOptionValue,
  ProductVariant,
} from '@/services/products/productsApi'
import type { PurchaseVariant } from './use-add-to-purchase'

const selectionFromVariant = (product: Product, variant: ProductVariant) =>
  Object.fromEntries(
    product.options.flatMap((option) => {
      const value = option.values.find((entry) =>
        variant.optionValueIds.includes(entry.id),
      )
      return value ? [[option.id, value]] : []
    }),
  ) as Record<string, ProductOptionValue>

/**
 * Option picking for a product's sellable combinations: starts on the first
 * combination, greys out values with no sellable combination alongside the
 * others picked, and jumps to a compatible combination when a pick would land
 * on an excluded one.
 */
export function useVariantSelection(product: Product) {
  const firstVariant = product.variants[0]
  const [selected, setSelected] = useState<Record<string, ProductOptionValue>>(
    () =>
      firstVariant
        ? selectionFromVariant(product, firstVariant)
        : Object.fromEntries(
            product.options.flatMap((option) =>
              option.values[0] ? [[option.id, option.values[0]]] : [],
            ),
          ),
  )

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

  /** The cart snapshot of the current pick, or undefined if none is sellable. */
  const purchaseVariant: PurchaseVariant | undefined = variant && {
    label: variant.label,
    values: product.options.map((option) => ({
      optionId: option.id,
      optionName: option.name,
      valueId: selected[option.id].id,
      value: selected[option.id].value,
    })),
    price,
  }

  return {
    selected,
    variant,
    price,
    isValueAvailable,
    selectValue,
    purchaseVariant,
  }
}
