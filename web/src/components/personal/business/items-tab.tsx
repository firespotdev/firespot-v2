'use client'

import { useState } from 'react'
import { useRouter } from '@bprogress/next/app'
import { Search, ShoppingBag } from 'lucide-react'
import { LoaderCircle } from '@/components/ui'
import { CartCheckoutBar } from '@/components/pay/cart-checkout-bar'
import { useAddToPurchase } from '@/hooks/use-add-to-purchase'
import { useDrawerStore } from '@/services/drawer'
import { cn } from '@/lib/utils'
import { usePublicCatalogue } from '@/services/products/hooks'
import type { Product } from '@/services/products/productsApi'
import { ProductCard, itemDetailsHref } from './product-card'

const productCategoryId = (product: Product) =>
  typeof product.categoryId === 'object'
    ? product.categoryId?._id
    : product.categoryId

function ProductGrid({
  products,
  businessId,
  onAdd,
}: {
  products: Product[]
  businessId: string
  onAdd?: (product: Product) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3.5 px-4">
      {products.map((product) => (
        <ProductCard
          key={product._id}
          product={product}
          href={itemDetailsHref(businessId, product._id)}
          onAdd={onAdd && (() => onAdd(product))}
        />
      ))}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 px-4 text-[18px] font-bold text-black">{children}</h2>
  )
}

export function ItemsTab({
  businessId,
  serialNumber,
  isScrolled,
}: {
  businessId: string
  /** The merchant's activated kit. Without one there is no checkout. */
  serialNumber?: string
  isScrolled?: boolean
}) {
  const router = useRouter()
  const { data, isLoading, isError } = usePublicCatalogue(businessId)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const { cartItems, addToPurchase } = useAddToPurchase(serialNumber)
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all')

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoaderCircle />
      </div>
    )
  }

  const allProducts =
    data?.products?.filter((product) => !product.isArchived) || []
  const categories = data?.categories || []

  if (isError || allProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280]">
          <ShoppingBag size={24} strokeWidth={1.5} />
        </div>
        <p className="mt-3 text-[15px] font-bold text-black">No items listed</p>
        <p className="mt-1 max-w-[260px] text-xs font-medium text-[#00000080]">
          This merchant hasn’t added any products to their showcase yet.
        </p>
      </div>
    )
  }

  const onAdd = serialNumber ? (product: Product) => addToPurchase(product) : undefined
  const gridProps = { businessId, onAdd }

  const uncategorized = allProducts.filter((product) => {
    const catId = productCategoryId(product)
    return !catId || !categories.some((c) => c._id === catId)
  })
  const selectedCategory = categories.find((c) => c._id === activeCategoryId)
  const selectedCategoryProducts = allProducts.filter(
    (product) => productCategoryId(product) === activeCategoryId,
  )

  return (
    <div className={serialNumber ? 'pb-28' : 'pb-8'}>
      {/* Sticks under the h-11 tab bar, and under the h-13 page header too once
          it slides in (h-11 + h-13 = top-24). */}
      <div
        className={cn(
          'sticky z-20 bg-white transition-[top] duration-150',
          isScrolled ? 'top-24' : 'top-11',
        )}
      >
        <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto px-4 py-3">
          <button
            type="button"
            onClick={() =>
              openDrawer({
                type: 'item-search',
                direction: 'bottom',
                props: { businessId, serialNumber },
              })
            }
            aria-label="Search items"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-black shadow-2xs transition-colors hover:bg-gray-50"
          >
            <Search size={18} strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategoryId('all')
            }}
            className={cn(
              'h-10 shrink-0 rounded-full px-5 text-[13px] font-bold transition-colors',
              activeCategoryId === 'all'
                ? 'bg-black text-white'
                : 'bg-[#F1F3F5] text-black hover:bg-[#E5E7EB]',
            )}
          >
            All
          </button>

          {categories.map((category) => {
            const isCatActive = activeCategoryId === category._id
            return (
              <button
                key={category._id}
                type="button"
                onClick={() => setActiveCategoryId(category._id)}
                className={cn(
                  'h-10 shrink-0 rounded-full px-5 text-[13px] font-semibold transition-colors',
                  isCatActive
                    ? 'bg-black text-white'
                    : 'bg-[#F1F3F5] text-black hover:bg-[#E5E7EB]',
                )}
              >
                {category.name}
              </button>
            )
          })}
        </div>
      </div>

      {activeCategoryId === 'all' ? (
        categories.length > 0 ? (
          <div>
            {categories.map((category) => {
              const categoryProducts = allProducts.filter(
                (product) => productCategoryId(product) === category._id,
              )
              if (categoryProducts.length === 0) return null
              return (
                <div key={category._id} className="mt-5 first:mt-2">
                  <SectionTitle>{category.name}</SectionTitle>
                  <ProductGrid products={categoryProducts} {...gridProps} />
                </div>
              )
            })}

            {uncategorized.length > 0 && (
              <div className="mt-6">
                <SectionTitle>Other Items</SectionTitle>
                <ProductGrid products={uncategorized} {...gridProps} />
              </div>
            )}
          </div>
        ) : (
          <div className="pt-2">
            <ProductGrid products={allProducts} {...gridProps} />
          </div>
        )
      ) : (
        <div className="pt-2">
          <SectionTitle>{selectedCategory?.name || 'Items'}</SectionTitle>
          {selectedCategoryProducts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm font-medium text-[#6B7280]">
              No items in this category yet.
            </p>
          ) : (
            <ProductGrid products={selectedCategoryProducts} {...gridProps} />
          )}
        </div>
      )}

      {serialNumber && (
        <CartCheckoutBar
          itemCount={cartItems.length}
          onCheckout={() => router.push(`/pay/${serialNumber}?checkout=cart`)}
          onViewSelection={() =>
            openDrawer({
              type: 'order-summary',
              direction: 'bottom',
              props: { merchantId: businessId, serialNumber },
            })
          }
          className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-125"
        />
      )}
    </div>
  )
}
