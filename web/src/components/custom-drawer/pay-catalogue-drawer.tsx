'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Image as ImageIcon, Plus, Search, X } from 'lucide-react'
import { usePublicCatalogue } from '@/services/products/hooks'
import type { Product } from '@/services/products/productsApi'
import type { MerchantProfile } from '@/services/qr/interface'
import { useDrawerStore } from '@/services/drawer'
import { Button } from '@/components/ui/button'
import { usePurchaseCartStore } from '@/services/pay/purchaseCartSlice'
import { LoaderCircle } from '../ui'
import { getBusinessImageUrl } from '@/lib/utils/business-image'

interface Props {
  merchant: MerchantProfile
  onCheckout: () => void
}

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const productCategoryId = (product: Product) =>
  typeof product.categoryId === 'string'
    ? product.categoryId
    : product.categoryId?._id

export function PayCatalogueDrawer({ merchant, onCheckout }: Props) {
  const closeDrawer = useDrawerStore((state) => state.closeDrawer)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const {
    data: catalogue,
    isLoading,
    isError,
    refetch,
  } = usePublicCatalogue(merchant.id)
  const cartItems = usePurchaseCartStore((state) => state.items)
  const onAddProduct = usePurchaseCartStore((state) => state.addProduct)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLowerCase()
  const businessImageUrl = getBusinessImageUrl(merchant)

  const visibleProducts = useMemo(() => {
    const products = catalogue?.products || []
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === 'all' ||
        productCategoryId(product) === activeCategory
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.description?.toLowerCase().includes(normalizedSearch)
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, catalogue?.products, normalizedSearch])

  const groupedProducts = useMemo(() => {
    if (!catalogue) return []
    if (activeCategory !== 'all' || normalizedSearch) {
      return [{ id: 'results', name: '', products: visibleProducts }]
    }
    return catalogue.categories
      .map((category) => ({
        id: category._id,
        name: category.name,
        products: visibleProducts.filter(
          (product) => productCategoryId(product) === category._id,
        ),
      }))
      .filter((group) => group.products.length > 0)
  }, [activeCategory, catalogue, normalizedSearch, visibleProducts])

  const quantityForProduct = (productId: string) =>
    cartItems
      .filter((item) => item.id.startsWith(productId))
      .reduce((total, item) => total + item.quantity, 0)

  const addProduct = (product: Product) => {
    if (product.options.length > 0 && product.variants.length > 0) {
      openDrawer({
        type: 'variant-selector',
        direction: 'bottom',
        props: {
          product,
          cartQuantity: quantityForProduct(product._id),
          actionLabel: 'Add to purchase',
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
          ) =>
            onAddProduct(
              product,
              { label: variant.label, values: variant.values },
              quantity,
              variant.price,
            ),
        },
      })
      return
    }
    onAddProduct(product)
  }

  return (
    <div className="flex min-h-0 w-full flex-col bg-white font-satoshi">
      <header className="flex shrink-0 items-center gap-3 border-b border-[#F1F1F1] px-4 py-2">
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-[#F1F1F1]">
          {businessImageUrl ? (
            <img
              src={businessImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-[#9CA3AF]">
              <ImageIcon size={16} />
            </div>
          )}
        </div>
        <h2 className="min-w-0 flex-1 truncate text-[14px] font-bold text-[#111827]">
          {merchant.businessName}
        </h2>
        <button
          type="button"
          onClick={() => closeDrawer('pay-catalogue')}
          aria-label="Close catalogue"
          className="grid h-9 w-9 shrink-0 place-items-center"
        >
          <ChevronDown size={22} />
        </button>
      </header>

      <div className="shrink-0 px-4 py-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            className="h-10 w-full rounded-full border-2 border-[#F1F1F1] bg-white pl-11 pr-10 text-[16px] font-medium outline-none placeholder:text-[#9CA3AF] focus:border-[#0075FF]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear product search"
              className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-[#6B7280] text-white"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <nav className="scrollbar-hide flex shrink-0 gap-2 overflow-x-auto border-b border-[#F1F1F1] px-4 pb-3">
        {[{ _id: 'all', name: 'All' }, ...(catalogue?.categories || [])].map(
          (category) => (
            <button
              key={category._id}
              type="button"
              onClick={() => setActiveCategory(category._id)}
              aria-pressed={activeCategory === category._id}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                activeCategory === category._id
                  ? 'bg-black text-white'
                  : 'bg-[#F4F4F4] text-black'
              }`}
            >
              {category.name}
            </button>
          ),
        )}
      </nav>

      <main className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div
            role="status"
            aria-label="Loading products"
            className="py-16 text-center text-sm font-medium text-[#6B7280]"
          >
            <LoaderCircle />
          </div>
        ) : isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <h3 className="text-[16px] font-bold">Couldn’t load products</h3>
            <p className="mt-1 max-w-64 text-sm text-[#6B7280]">
              Check your connection, then try again.
            </p>
            <Button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 h-10 w-auto px-5"
            >
              Try again
            </Button>
          </div>
        ) : groupedProducts.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <Search size={30} className="text-[#9CA3AF]" />
            <h3 className="mt-3 text-[16px] font-bold">No products found</h3>
            <p className="mt-1 max-w-64 text-sm text-[#6B7280]">
              Try another category or search term.
            </p>
          </div>
        ) : (
          groupedProducts.map((group) => (
            <section key={group.id} className="pt-3">
              {group.name && (
                <h3 className="mb-1 text-[16px] font-bold">{group.name}</h3>
              )}
              <div>
                {group.products.map((product) => {
                  const quantity = quantityForProduct(product._id)
                  return (
                    <div
                      key={product._id}
                      className="flex min-w-0 items-center gap-3 border-b border-[#F1F1F1] py-2 last:border-0"
                    >
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
                          {product.description || 'Product'}
                        </p>
                        <p className="mt-1 text-[14px] font-medium text-[#374151]">
                          NGN {money(product.price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        aria-label={`Add ${product.name}`}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#F1F1F1]"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </main>

      <footer className="flex shrink-0 items-center gap-3 border-t border-[#F1F1F1] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onCheckout}
          disabled={cartItems.length === 0}
          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
        >
          <span className="block text-[14px] font-bold text-[#111827]">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}{' '}
            selected
          </span>
          <span className="mt-0.5 block text-xs font-medium text-[#9CA3AF]">
            View selection ›
          </span>
        </button>
        <Button
          type="button"
          onClick={onCheckout}
          disabled={cartItems.length === 0}
          className="h-11 w-auto px-6"
        >
          Checkout
        </Button>
      </footer>
    </div>
  )
}
