'use client'

import { ProductForm } from '@/components/products'
import type { Product } from '@/services/products/productsApi'

interface AddProductDrawerProps {
  initialCategoryId?: string
  product?: Product
  closeDrawer: () => void
}

export function AddProductDrawer({
  initialCategoryId,
  product,
  closeDrawer,
}: AddProductDrawerProps) {
  return (
    <ProductForm
      product={product}
      initialCategoryId={initialCategoryId}
      onBack={closeDrawer}
      onSaved={closeDrawer}
    />
  )
}
