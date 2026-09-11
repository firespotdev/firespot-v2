'use client'

import { Image as ImageIcon, Plus, Search, X } from 'lucide-react'
import { useProductCategories } from '@/services/products/hooks'
import type { Product } from '@/services/products/productsApi'
import type { DrawerConfig } from '@/services/drawer'
import { Button, EmptyState, Input, LoaderCircle } from '@/components/ui'

interface ItemsTabProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  isSearchActive: boolean
  setIsSearchActive: (active: boolean) => void
  activeCategory: string
  setActiveCategory: (category: string) => void
  products: Product[]
  isLoading: boolean
  getProductCartQuantity: (id: string) => number
  handleProductAddTapped: (product: Product) => void
  getGroupedProducts: () => Record<string, Product[]>
  openDrawer: (config: DrawerConfig) => void
}

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

function ProductRow({
  product,
  quantity,
  onAdd,
}: {
  product: Product
  quantity: number
  onAdd: () => void
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-[#F1F1F1] py-2 last:border-0">
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
        {quantity > 0 && (
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-[22px] font-bold text-white">
            {quantity}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold text-[#111827]">
          {product.name}
        </p>
        <p className="truncate text-sm font-medium text-[#6B7280]">
          {product.description || 'Custom item'}
        </p>
        <p className="mt-1 text-[14px] font-medium text-[#374151]">
          NGN {money(product.price)}
        </p>
      </div>

      <button
        type="button"
        onClick={onAdd}
        aria-label={`Add ${product.name}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#F1F1F1] text-black"
      >
        <Plus size={18} />
      </button>
    </div>
  )
}

export function ItemsTab({
  searchQuery,
  setSearchQuery,
  isSearchActive,
  setIsSearchActive,
  activeCategory,
  setActiveCategory,
  products,
  isLoading,
  getProductCartQuantity,
  handleProductAddTapped,
  getGroupedProducts,
  openDrawer,
}: ItemsTabProps) {
  const { data: catalogue } = useProductCategories()
  const trimmedQuery = searchQuery.trim()
  const isSearching = trimmedQuery.length > 0
  const visibleProducts =
    isSearchActive && !isSearching ? products.slice(0, 4) : products

  const closeSearch = () => {
    setSearchQuery('')
    setIsSearchActive(false)
  }

  const renderProduct = (product: Product) => (
    <ProductRow
      key={product._id}
      product={product}
      quantity={getProductCartQuantity(product._id)}
      onAdd={() => handleProductAddTapped(product)}
    />
  )

  const categories = catalogue?.categories || []
  const hasCategories = categories.length > 0
  const isCategoryEmpty = activeCategory !== 'All' && products.length === 0
  const showCategoryFilter =
    !isSearchActive &&
    !isLoading &&
    hasCategories &&
    (products.length > 0 || isCategoryEmpty)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="px-3 pt-2">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
          <Input
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchActive(true)}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search products"
            className="h-9 w-full rounded-[30px] bg-white pl-11 pr-11 text-sm font-medium placeholder:text-[#00000066] focus:border-ring focus:ring-ring/50 focus:ring-[3px]"
          />
          {isSearchActive && (
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close product search"
              className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-[#6B7280] text-white"
            >
              <X size={16} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {showCategoryFilter && (
        <div className="scrollbar-hide flex shrink-0 gap-2 overflow-x-auto border-b border-[#F1F1F1] px-3 py-3">
          {[
            { id: 'All', name: 'All' },
            ...categories.map((category) => ({
              id: category._id,
              name: category.name,
            })),
          ].map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                activeCategory === category.id
                  ? 'bg-black text-white'
                  : 'bg-[#F1F1F1] text-black'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-24">
        {isSearchActive ? (
          <>
            <h2
              className={`py-3 ${
                isSearching
                  ? 'text-sm font-medium text-[#9CA3AF]'
                  : 'text-[16px] font-bold'
              }`}
            >
              {isSearching
                ? `${products.length} ${products.length === 1 ? 'result' : 'results'} for “${trimmedQuery}”`
                : 'Frequent searches'}
            </h2>
            {isLoading ? (
              <div
                role="status"
                aria-label="Loading products"
                className="my-auto flex items-center justify-center py-12"
              >
                <LoaderCircle />
              </div>
            ) : visibleProducts.length > 0 ? (
              <div>{visibleProducts.map(renderProduct)}</div>
            ) : (
              <div className="my-auto flex min-h-64 flex-col items-center justify-center text-center">
                <div className="text-[48px] mb-3">🔍</div>
                <h3 className="mt-4 text-[16px] font-bold">
                  No products found
                </h3>
                <p className="mt-1 max-w-60 text-sm text-[#6B7280] font-medium">
                  Try another product name or keyword.
                </p>
              </div>
            )}
          </>
        ) : isLoading ? (
          <div
            role="status"
            aria-label="Loading products"
            className="my-auto flex items-center justify-center py-12"
          >
            <LoaderCircle />
          </div>
        ) : products.length > 0 ? (
          <div className="space-y-3 py-3">
            {Object.entries(getGroupedProducts()).map(
              ([categoryName, categoryProducts], index, entries) => {
                const hasNextCategory = index < entries.length - 1
                return (
                  <section key={categoryName}>
                    <h2 className="mb-2 text-[16px] font-bold capitalize">
                      {categoryName}
                    </h2>
                    <div
                      className={
                        hasNextCategory ? 'border-b border-[#F1F1F1] pb-3' : ''
                      }
                    >
                      {categoryProducts.map(renderProduct)}
                    </div>
                  </section>
                )
              },
            )}
          </div>
        ) : (
          <div className="my-auto flex w-full flex-col items-center justify-center py-6 text-center">
            <EmptyState
              emoji={<span className="mb-6 text-[56px]">📦</span>}
              title={
                isCategoryEmpty
                  ? 'No products in this category'
                  : 'No products yet'
              }
              details={
                isCategoryEmpty
                  ? 'Add products to this category or choose another category above.'
                  : 'Add products to your catalogue before recording itemised sales.'
              }
              cta={
                <Button
                  type="button"
                  onClick={() => openDrawer({ type: 'add-product' })}
                  className="mt-6 h-9 w-fit px-4 text-[10px] tracking-[1px]"
                >
                  <Plus size={16} /> ADD PRODUCT
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
