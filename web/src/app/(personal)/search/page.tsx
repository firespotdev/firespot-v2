'use client'

import { Suspense, useDeferredValue, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Package, Search, X } from 'lucide-react'
import { BarcodeIcon } from '@phosphor-icons/react'
import {
  ActionList,
  ActionListItem,
  Button,
  LoaderCircle,
} from '@/components/ui'
import { MerchantAvatar } from '@/components/layout'
import { useSearchParams } from 'next/navigation'
import {
  useDiscoverMerchants,
  useDiscoverProducts,
  type DiscoveredMerchant,
  type DiscoveredProduct,
  type DiscoveryMeta,
} from '@/services/discovery'
import { useCustomerHistory } from '@/services/sales/hooks'
import { resolveSaleMerchant } from '@/lib/utils/customer-sale'
import { formatCurrency } from '@/lib/utils'

type SearchType = 'all' | 'shops' | 'products'

interface KnownMerchant extends DiscoveredMerchant {
  purchaseCount: number
  lastSeenAt: number
}

const SEARCH_TYPES: Array<{ value: SearchType; label: string }> = [
  { value: 'all', label: 'ALL' },
  { value: 'shops', label: 'SHOPS' },
  { value: 'products', label: 'PRODUCTS' },
]

function knownMerchants(
  sales: ReturnType<typeof useCustomerHistory>['data'],
): KnownMerchant[] {
  const merchants = new Map<string, KnownMerchant>()

  for (const sale of sales || []) {
    const merchant = resolveSaleMerchant(sale)
    if (!merchant.id) continue
    const seenAt = new Date(sale.recordedAt || sale.createdAt).getTime()
    const existing = merchants.get(merchant.id)

    if (existing) {
      existing.purchaseCount += 1
      existing.lastSeenAt = Math.max(existing.lastSeenAt, seenAt)
      if (!existing.serialNumber && sale.serialNumber) {
        existing.serialNumber = sale.serialNumber
      }
      continue
    }

    merchants.set(merchant.id, {
      id: merchant.id,
      businessName: merchant.businessName || 'Merchant',
      merchantSlug: merchant.merchantSlug,
      businessImageUrl:
        merchant.businessImageUrl || merchant.profilePhotoUrl,
      businessIndustry: merchant.businessIndustry,
      serialNumber: sale.serialNumber || '',
      purchaseCount: 1,
      lastSeenAt: seenAt,
    })
  }

  return Array.from(merchants.values())
}

function KnownMerchantStrip({
  title,
  merchants,
}: {
  title: string
  merchants: KnownMerchant[]
}) {
  if (!merchants.length) return null

  return (
    <section className="border-b border-[#F1F1F1] py-4">
      <h2 className="mb-3 text-sm font-bold text-black">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
        {merchants.map((merchant) => {
          const content = (
            <>
              <MerchantAvatar
                profilePhotoUrl={merchant.businessImageUrl}
                alt={merchant.businessName}
                size={64}
              />
              <span className="mt-2 max-w-20 truncate text-xs font-medium text-black">
                {merchant.businessName}
              </span>
            </>
          )

          return merchant.serialNumber ? (
            <Link
              key={merchant.id}
              href={`/pay/${merchant.serialNumber}`}
              className="flex w-20 shrink-0 flex-col items-center"
            >
              {content}
            </Link>
          ) : (
            <div
              key={merchant.id}
              className="flex w-20 shrink-0 flex-col items-center"
            >
              {content}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MerchantResults({
  merchants,
  title,
}: {
  merchants: DiscoveredMerchant[]
  title?: string
}) {
  if (!merchants.length) return null

  return (
    <section className="py-4">
      {title && <h2 className="mb-3 text-sm font-bold text-black">{title}</h2>}
      <ActionList>
        {merchants.map((merchant) => {
          const location = [merchant.city, merchant.state]
            .filter(Boolean)
            .join(', ')
          return (
            <ActionListItem
              key={merchant.id}
              href={`/pay/${merchant.serialNumber}`}
              icon={
                <MerchantAvatar
                  profilePhotoUrl={merchant.businessImageUrl}
                  alt={merchant.businessName}
                  size={48}
                />
              }
              title={merchant.businessName}
              subtitle={
                [merchant.businessIndustry, location].filter(Boolean).join(' · ') ||
                'Shop on Firespot'
              }
            />
          )
        })}
      </ActionList>
    </section>
  )
}

function ProductResults({
  products,
  title,
}: {
  products: DiscoveredProduct[]
  title?: string
}) {
  if (!products.length) return null

  return (
    <section className="py-4">
      {title && <h2 className="mb-3 text-sm font-bold text-black">{title}</h2>}
      <ActionList>
        {products.map((product) => (
          <ActionListItem
            key={product.id}
            href={`/pay/${product.merchant.serialNumber}`}
            icon={
              <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-[#F1F1F1] text-[#9CA3AF]">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <Package size={20} />
                )}
              </span>
            }
            title={product.name}
            subtitle={`${product.merchant.businessName} · NGN ${formatCurrency(product.price)}`}
          />
        ))}
      </ActionList>
    </section>
  )
}

function Pagination({
  meta,
  onPageChange,
}: {
  meta?: DiscoveryMeta
  onPageChange: (page: number) => void
}) {
  if (!meta || meta.lastPage <= 1) return null

  return (
    <div className="flex items-center justify-between gap-3 pb-5">
      <Button
        type="button"
        variant="outline"
        disabled={meta.page <= 1}
        onClick={() => onPageChange(meta.page - 1)}
        className="h-9"
      >
        Previous
      </Button>
      <span className="shrink-0 text-xs font-medium text-[#00000080]">
        {meta.page} of {meta.lastPage}
      </span>
      <Button
        type="button"
        variant="outline"
        disabled={meta.page >= meta.lastPage}
        onClick={() => onPageChange(meta.page + 1)}
        className="h-9"
      >
        Next
      </Button>
    </div>
  )
}

function SearchPageContent() {
  const searchParams = useSearchParams()
  const requestedType = searchParams.get('type')
  const initialType: SearchType =
    requestedType === 'shops' || requestedType === 'products'
      ? requestedType
      : 'all'
  const [activeType, setActiveType] = useState<SearchType>(initialType)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search.trim())
  const canDiscover =
    deferredSearch.length === 0 || deferredSearch.length >= 2
  const params = {
    search: deferredSearch || undefined,
    page: activeType === 'all' ? 1 : page,
    limit: activeType === 'all' ? 6 : 20,
  }
  const merchantsQuery = useDiscoverMerchants(
    params,
    canDiscover && activeType !== 'products',
  )
  const productsQuery = useDiscoverProducts(
    params,
    canDiscover && activeType !== 'shops',
  )
  const historyQuery = useCustomerHistory()
  const known = useMemo(
    () => knownMerchants(historyQuery.data),
    [historyQuery.data],
  )
  const recent = useMemo(
    () => known.toSorted((a, b) => b.lastSeenAt - a.lastSeenAt),
    [known],
  )
  const frequent = useMemo(
    () =>
      known.toSorted(
        (a, b) =>
          b.purchaseCount - a.purchaseCount || b.lastSeenAt - a.lastSeenAt,
      ),
    [known],
  )
  const merchants = merchantsQuery.data?.data || []
  const products = productsQuery.data?.data || []
  const isFetching =
    (activeType !== 'products' && merchantsQuery.isFetching) ||
    (activeType !== 'shops' && productsQuery.isFetching)
  const isError =
    (activeType !== 'products' && merchantsQuery.isError) ||
    (activeType !== 'shops' && productsQuery.isError)
  const noResults = merchants.length === 0 && products.length === 0

  const changeType = (type: SearchType) => {
    setActiveType(type)
    setPage(1)
  }

  return (
    <div className="min-h-dvh bg-[#F4F6F8]">
      <div className="max-w-125 mx-auto pb-28 px-3">
        <header className="flex py-2 gap-2 items-center w-full justify-between">
          <div className="relative z-20 w-full">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#00000066]"
            />
            <input
              type="search"
              placeholder="Search shops or products"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className="w-full h-9 pl-9 pr-9 bg-[#E6E8EB99] border-2 border-transparent -tracking-[0.2px] rounded-full text-base font-medium placeholder:text-[#00000066] focus:bg-white focus:border-[#0075FF] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full active:bg-black/5"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <Link
            href="/"
            aria-label="Scan QR code"
            className="grid h-9 min-w-9 place-items-center rounded-full border border-[#444444] bg-[#333333]"
          >
            <BarcodeIcon color="white" size={16} />
          </Link>
        </header>

        <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
          {SEARCH_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => changeType(type.value)}
              className={`shrink-0 rounded-full px-4 h-9 text-[10px] font-bold tracking-[1px] ${
                activeType === type.value
                  ? 'bg-black text-white'
                  : 'bg-[#E5E7EB99] text-black'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {!deferredSearch && (
          <>
            <KnownMerchantStrip title="Frequent" merchants={frequent} />
            <KnownMerchantStrip title="Recent" merchants={recent} />
          </>
        )}

        {!canDiscover ? (
          <p className="py-12 text-center text-sm font-medium text-[#00000080]">
            Enter at least 2 characters to search.
          </p>
        ) : isFetching ? (
          <div className="flex justify-center py-16">
            <LoaderCircle />
          </div>
        ) : isError ? (
          <p className="py-12 text-center text-sm font-medium text-[#00000080]">
            Couldn’t load discovery results. Try again later.
          </p>
        ) : noResults ? (
          <p className="py-12 text-center text-sm font-medium text-[#00000080]">
            {deferredSearch
              ? `No results found for “${deferredSearch}”.`
              : 'No shops or products are available yet.'}
          </p>
        ) : (
          <>
            <MerchantResults
              merchants={merchants}
              title={
                activeType === 'all'
                  ? deferredSearch
                    ? 'Shops'
                    : 'Explore shops'
                  : undefined
              }
            />
            <ProductResults
              products={products}
              title={
                activeType === 'all'
                  ? deferredSearch
                    ? 'Products'
                    : 'Explore products'
                  : undefined
              }
            />
            {activeType === 'shops' && (
              <Pagination
                meta={merchantsQuery.data?.meta}
                onPageChange={setPage}
              />
            )}
            {activeType === 'products' && (
              <Pagination
                meta={productsQuery.data?.meta}
                onPageChange={setPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <SearchPageContent />
    </Suspense>
  )
}
