'use client'

import { useState } from 'react'
import { useRouter } from '@bprogress/next/app'
import { Search, X } from 'lucide-react'
import { EmptyState, LoaderCircle } from '@/components/ui'
import { CartCheckoutBar } from '@/components/pay/cart-checkout-bar'
import { CatalogueProductRow } from '@/components/pay/catalogue-product-row'
import { useAddToPurchase } from '@/hooks/use-add-to-purchase'
import {
  readFrequentPicks,
  recordFrequentPick,
} from '@/lib/utils/frequent-picks'
import { useDrawerStore } from '@/services/drawer'
import { usePublicCatalogue } from '@/services/products/hooks'
import type { Product } from '@/services/products/productsApi'
import { itemDetailsHref } from './product-card'

interface ItemSearchDrawerProps {
  businessId: string
  /** The merchant's activated kit. Without one there is no checkout. */
  serialNumber?: string
  closeDrawer: () => void
}

function matches(product: Product, query: string) {
  return (
    product.name.toLowerCase().includes(query) ||
    Boolean(product.description?.toLowerCase().includes(query))
  )
}

/**
 * Full-screen search over one business's items. Before typing it lists this
 * customer's frequent picks (items they opened or added from here before).
 */
export function ItemSearchDrawer({
  businessId,
  serialNumber,
  closeDrawer,
}: ItemSearchDrawerProps) {
  const router = useRouter()
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const closeAllDrawers = useDrawerStore((state) => state.closeAllDrawers)
  const { data, isLoading } = usePublicCatalogue(businessId)
  const { cartItems, quantityForProduct, addToPurchase } =
    useAddToPurchase(serialNumber)
  const [query, setQuery] = useState('')
  const [frequentIds] = useState(() => readFrequentPicks(businessId))

  const products = (data?.products || []).filter(
    (product) => !product.isArchived,
  )
  const normalizedQuery = query.trim().toLowerCase()
  const results = normalizedQuery
    ? products.filter((product) => matches(product, normalizedQuery))
    : frequentIds.flatMap(
        (id) => products.find((product) => product._id === id) ?? [],
      )

  const openItem = (product: Product) => {
    recordFrequentPick(businessId, product._id)
    closeDrawer()
    router.push(itemDetailsHref(businessId, product._id))
  }

  const addItem = (product: Product) => {
    recordFrequentPick(businessId, product._id)
    addToPurchase(product)
  }

  // The clear button empties the field first, then closes the search.
  const clearOrClose = () => (query ? setQuery('') : closeDrawer())

  return (
    <div className="flex h-dvh w-full flex-col bg-white font-satoshi">
      <header className="shrink-0 border-b border-[#F1F1F1] px-4 py-2">
        {/* Same field as the personal search page (/search). */}
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#00000066]"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search items"
            aria-label="Search items"
            autoFocus
            className="h-9 w-full rounded-full border-2 border-transparent bg-[#E6E8EB99] pl-9 pr-9 text-base font-medium -tracking-[0.2px] placeholder:text-[#00000066] focus:border-[#0075FF] focus:bg-white focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            onClick={clearOrClose}
            aria-label={query ? 'Clear search' : 'Close search'}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full active:bg-black/5"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoaderCircle />
          </div>
        ) : normalizedQuery ? (
          <>
            <p className="pt-4 pb-1 text-[13px] font-medium text-[#9CA3AF]">
              {results.length} {results.length === 1 ? 'result' : 'results'}{' '}
              for “{query.trim()}”
            </p>
            {results.length === 0 ? (
              <p className="py-12 text-center text-sm font-medium text-[#6B7280]">
                No items match your search.
              </p>
            ) : null}
          </>
        ) : results.length > 0 ? (
          <h2 className="pt-4 pb-1 text-[20px] font-bold text-black">
            Frequent searches
          </h2>
        ) : (
          <div className="py-16">
            <EmptyState
              emoji={
                <span
                  className="text-[56px] leading-none"
                  role="img"
                  aria-label="Magnifying glass"
                >
                  🔍
                </span>
              }
              title="Search this business"
              details="Items you open or add from search will show up here."
              cta={null}
            />
          </div>
        )}

        {!isLoading &&
          results.map((product) => (
            <CatalogueProductRow
              key={product._id}
              product={product}
              quantity={quantityForProduct(product._id)}
              onOpen={() => openItem(product)}
              onAdd={serialNumber ? () => addItem(product) : undefined}
            />
          ))}
      </main>

      {serialNumber && (
        <CartCheckoutBar
          itemCount={cartItems.length}
          onCheckout={() => {
            closeAllDrawers()
            router.push(`/pay/${serialNumber}?checkout=cart`)
          }}
          onViewSelection={() =>
            openDrawer({
              type: 'order-summary',
              direction: 'bottom',
              props: { merchantId: businessId, serialNumber },
            })
          }
        />
      )}
    </div>
  )
}
