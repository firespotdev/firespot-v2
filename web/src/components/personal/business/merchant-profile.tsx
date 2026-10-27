'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from '@bprogress/next/app'
import {
  ArrowUpRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  ScanBarcode,
  Search,
  Share,
  ShoppingBag,
  X,
} from 'lucide-react'
import { LoaderCircle } from '@/components/ui'
import type { PublicBusinessProfile } from '@/services/business-profile'
import { cn, formatCurrency } from '@/lib/utils'
import { usePublicCatalogue } from '@/services/products/hooks'
import { useMerchantPosts } from '@/services/posts/hooks'
import type { Product } from '@/services/products/productsApi'
import { Activity } from './activity'
import { Feedback } from './feedback'

export type BusinessTab =
  | 'items'
  | 'posts'
  | 'feedback'
  | 'activity'
  | 'about'

interface MerchantProfileProps {
  business: PublicBusinessProfile
  activeTab: BusinessTab
  onTabChange: (tab: BusinessTab) => void
  isFavorite: boolean
  isFavoritePending: boolean
  onToggleFavorite: () => void
  onShare: () => Promise<void>
  isScrolled?: boolean
}

const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function externalHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-[6px] border border-[#0000001A] bg-white px-[8px] py-[7px]">
      {children}
    </div>
  )
}

function AccordionSection({
  title,
  hasContent,
  children,
}: {
  title: string
  hasContent: boolean
  children: React.ReactNode
}) {
  return (
    <details
      open={hasContent}
      className="group border-b border-[#f1f1f1] last:border-0"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between py-[0.9rem] text-[0.938rem] font-semibold marker:hidden">
        {title}
        <ChevronUp
          size={16}
          className="transition-transform group-not-open:rotate-180"
        />
      </summary>
      {hasContent && <div className="pb-4">{children}</div>}
    </details>
  )
}

function SocialLink({
  href,
  src,
  label,
}: {
  href?: string
  src: string
  label: string
}) {
  if (!href) return null
  return (
    <Link
      href={externalHref(href)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center"
    >
      <Image src={src} alt="" width={36} height={36} className="h-9 w-9" />
    </Link>
  )
}

function OpeningHours({ business }: { business: PublicBusinessProfile }) {
  const days = business.openingHours?.days.filter((day) => day.enabled) || []
  if (days.length === 0) {
    return (
      <p className="text-sm font-medium text-[#000000B2]">
        No opening hours available yet.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      {days.map((day) => (
        <div
          key={day.day}
          className="flex items-center justify-between gap-4 text-sm font-medium text-[#000000B2]"
        >
          <span>{day.day}</span>
          <span>
            {day.opensAt || '—'} – {day.closesAt || '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

function ProductCard({
  product,
  serialNumber,
  onAdd,
}: {
  product: Product
  serialNumber?: string
  onAdd: () => void
}) {
  const router = useRouter()

  const formattedPrice =
    product.price % 1 === 0
      ? new Intl.NumberFormat('en-NG').format(product.price)
      : formatCurrency(product.price)

  const hasMultiplePrices = (product.variantPriceOverrides?.length ?? 0) > 0
  const maxVariantPrice = hasMultiplePrices
    ? Math.max(...product.variantPriceOverrides.map((v) => v.price))
    : null
  const strikePrice =
    maxVariantPrice && maxVariantPrice > product.price
      ? maxVariantPrice % 1 === 0
        ? new Intl.NumberFormat('en-NG').format(maxVariantPrice)
        : formatCurrency(maxVariantPrice)
      : null

  return (
    <div
      onClick={() => {
        if (serialNumber) router.push(`/pay/${serialNumber}`)
      }}
      className="group flex cursor-pointer flex-col"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[14px] bg-[#F4F6F8]">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 240px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[#9CA3AF]">
            <Package size={32} strokeWidth={1.5} />
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
          aria-label={`Add ${product.name}`}
          className="absolute bottom-2.5 right-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-transform active:scale-90 hover:bg-gray-50"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <h3 className="mt-2 line-clamp-1 text-[14px] font-bold leading-snug text-black">
        {product.name}
      </h3>

      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-[14px] font-bold text-[#00BA55]">
          ₦ {formattedPrice}
        </span>
        {strikePrice && (
          <span className="text-[12px] font-medium text-[#9CA3AF] line-through">
            ₦ {strikePrice}
          </span>
        )}
      </div>

      {product.description && (
        <p className="mt-1 line-clamp-2 text-xs font-normal leading-[1.35] text-[#6B7280]">
          {product.description}
        </p>
      )}
    </div>
  )
}

function ItemsTab({
  merchantId,
  serialNumber,
}: {
  merchantId: string
  serialNumber?: string
}) {
  const router = useRouter()
  const { data, isLoading, isError } = usePublicCatalogue(merchantId)
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)

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

  const queryTrimmed = searchQuery.trim().toLowerCase()
  const searchFilteredProducts = queryTrimmed
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(queryTrimmed) ||
          p.description?.toLowerCase().includes(queryTrimmed),
      )
    : allProducts

  return (
    <div className="pb-8">
      {/* Category Pills & Search Bar */}
      <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto px-4 py-3">
        <button
          type="button"
          onClick={() => {
            setIsSearchOpen(!isSearchOpen)
            if (isSearchOpen) setSearchQuery('')
          }}
          aria-label={isSearchOpen ? 'Close search' : 'Search items'}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-black shadow-2xs transition-colors hover:bg-gray-50',
            (isSearchOpen || searchQuery) &&
              'border-black bg-black text-white hover:bg-black',
          )}
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
            activeCategoryId === 'all' && !searchQuery
              ? 'bg-black text-white'
              : 'bg-[#F1F3F5] text-black hover:bg-[#E5E7EB]',
          )}
        >
          All
        </button>

        {categories.map((category) => {
          const isCatActive = activeCategoryId === category._id && !searchQuery
          return (
            <button
              key={category._id}
              type="button"
              onClick={() => {
                setActiveCategoryId(category._id)
                setSearchQuery('')
              }}
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

      {/* Expandable Search Input */}
      {isSearchOpen && (
        <div className="px-4 pb-2">
          <div className="relative flex items-center">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              autoFocus
              className="h-10 w-full rounded-full border border-gray-200 bg-[#F9FAFB] pl-9 pr-9 text-sm text-black outline-none focus:border-black"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-gray-400 hover:text-black"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Product Groupings */}
      {queryTrimmed ? (
        <div className="pt-2">
          <h2 className="mb-3 px-4 text-[18px] font-bold text-black">
            Search Results ({searchFilteredProducts.length})
          </h2>
          {searchFilteredProducts.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm font-medium text-[#6B7280]">
              No items match &quot;{searchQuery}&quot;.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 px-4">
              {searchFilteredProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  serialNumber={serialNumber}
                  onAdd={() => {
                    if (serialNumber) router.push(`/pay/${serialNumber}`)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeCategoryId === 'all' ? (
        categories.length > 0 ? (
          <div>
            {categories.map((category) => {
              const categoryProducts = allProducts.filter((product) => {
                const catId =
                  typeof product.categoryId === 'object'
                    ? product.categoryId?._id
                    : product.categoryId
                return catId === category._id
              })

              if (categoryProducts.length === 0) return null

              return (
                <div key={category._id} className="mt-5 first:mt-2">
                  <h2 className="mb-3 px-4 text-[18px] font-bold text-black">
                    {category.name}
                  </h2>
                  <div className="grid grid-cols-2 gap-3.5 px-4">
                    {categoryProducts.map((product) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        serialNumber={serialNumber}
                        onAdd={() => {
                          if (serialNumber) router.push(`/pay/${serialNumber}`)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {(() => {
              const uncategorized = allProducts.filter((product) => {
                const catId =
                  typeof product.categoryId === 'object'
                    ? product.categoryId?._id
                    : product.categoryId
                return !catId || !categories.some((c) => c._id === catId)
              })
              if (uncategorized.length === 0) return null
              return (
                <div className="mt-6">
                  <h2 className="mb-3 px-4 text-[18px] font-bold text-black">
                    Other Items
                  </h2>
                  <div className="grid grid-cols-2 gap-3.5 px-4">
                    {uncategorized.map((product) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        serialNumber={serialNumber}
                        onAdd={() => {
                          if (serialNumber) router.push(`/pay/${serialNumber}`)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="pt-2">
            <div className="grid grid-cols-2 gap-3.5 px-4">
              {allProducts.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  serialNumber={serialNumber}
                  onAdd={() => {
                    if (serialNumber) router.push(`/pay/${serialNumber}`)
                  }}
                />
              ))}
            </div>
          </div>
        )
      ) : (
        (() => {
          const selectedCategory = categories.find(
            (c) => c._id === activeCategoryId,
          )
          const filtered = allProducts.filter((product) => {
            const catId =
              typeof product.categoryId === 'object'
                ? product.categoryId?._id
                : product.categoryId
            return catId === activeCategoryId
          })

          return (
            <div className="pt-2">
              <h2 className="mb-3 px-4 text-[18px] font-bold text-black">
                {selectedCategory?.name || 'Items'}
              </h2>
              {filtered.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm font-medium text-[#6B7280]">
                  No items in this category yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3.5 px-4">
                  {filtered.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      serialNumber={serialNumber}
                      onAdd={() => {
                        if (serialNumber) router.push(`/pay/${serialNumber}`)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })()
      )}
    </div>
  )
}

function PostsTab({
  merchantId,
  businessName,
}: {
  merchantId: string
  businessName: string
}) {
  const { data, isLoading, isError } = useMerchantPosts(merchantId)

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoaderCircle />
      </div>
    )
  }

  const posts = data || []

  if (isError || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280]">
          <FileText size={24} strokeWidth={1.5} />
        </div>
        <p className="mt-3 text-[15px] font-bold text-black">No posts yet</p>
        <p className="mt-1 max-w-[260px] text-xs font-medium text-[#00000080]">
          When this merchant publishes posts or social updates, they’ll show up
          here.
        </p>
      </div>
    )
  }

  return (
    <div className="pt-3">
      <div className="grid grid-cols-2 gap-3 px-4">
        {posts.map((post) => {
          const captionText = post.productIds?.length
            ? `${post.productIds.length} item${post.productIds.length === 1 ? '' : 's'} in this post`
            : post.caption ||
              post.preview?.description ||
              post.preview?.title ||
              ''

          return (
            <article
              key={post._id}
              onClick={() => {
                if (post.sourceUrl) {
                  window.open(post.sourceUrl, '_blank', 'noopener,noreferrer')
                }
              }}
              className="group relative aspect-[0.62] w-full cursor-pointer overflow-hidden rounded-[14px] bg-[#1F2937] shadow-xs transition-transform active:scale-[0.98]"
            >
              {post.preview?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.preview.imageUrl}
                  alt={post.caption || 'Post image'}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-linear-to-br from-[#FB5012] via-[#D72483] to-[#6D3CE8]" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

              <div className="absolute inset-x-3 bottom-3 text-left text-white">
                <p className="truncate text-[14px] font-bold leading-tight drop-shadow-xs">
                  {post.merchant?.businessName || businessName}
                </p>
                <p className="mt-1 truncate text-[12px] font-medium leading-tight text-white/85 drop-shadow-xs">
                  {captionText}
                </p>
              </div>
            </article>
          )
        })}
      </div>

      <div className="py-8 text-center text-xs font-medium text-[#9CA3AF]">
        You’ve reached the end of the list
      </div>
    </div>
  )
}

export function MerchantProfile({
  business,
  activeTab,
  onTabChange,
  isFavorite,
  isFavoritePending,
  onToggleFavorite,
  onShare,
  isScrolled,
}: MerchantProfileProps) {
  const statsContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const checkScrollable = () => {
    const container = statsContainerRef.current
    if (!container) return
    setShowLeftArrow(container.scrollLeft > 0)
    setShowRightArrow(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10,
    )
  }

  const scrollStats = (direction: -1 | 1) => {
    statsContainerRef.current?.scrollBy({
      left: direction * 200,
      behavior: 'smooth',
    })
  }

  const tabItems: Array<{ value: BusinessTab; label: string }> = [
    { value: 'items', label: 'Items' },
    { value: 'posts', label: 'Posts' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'activity', label: 'Activity' },
    { value: 'about', label: 'About' },
  ]
  const hasOpeningHours = Boolean(
    business.openingHours?.days.some((day) => day.enabled),
  )
  const hasSocialLinks = Object.values(business.socialLinks).some(Boolean)

  return (
    <div className="flex w-full flex-col pt-[18px]">
      <div className="relative mb-3.5 w-full">
        {showLeftArrow && (
          <button
            type="button"
            onClick={() => scrollStats(-1)}
            className="absolute left-0 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full border border-[#0000001A] bg-white p-1 shadow-md"
            aria-label="Scroll stats left"
          >
            <ChevronLeft strokeWidth={2} size={12} />
          </button>
        )}

        <div
          ref={statsContainerRef}
          onScroll={checkScrollable}
          className="hide-scrollbar flex w-full items-center gap-2 overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {business.businessIndustry && (
            <StatChip>
              <div className="text-[14px] leading-none">🍔</div>
              <span className="text-[13px] leading-none font-medium text-black">
                {business.businessIndustry}
              </span>
            </StatChip>
          )}
          <StatChip>
            <div className="text-[14px] leading-none">👤</div>
            <span className="text-[13px] font-medium text-black">
              {compactNumber.format(business.stats.monthlyVisits)}
            </span>
            <span className="text-[13px] font-medium text-[#00000080]">
              monthly visits
            </span>
          </StatChip>
          <StatChip>
            <div className="text-[14px] leading-none">❤️</div>
            <span className="text-[13px] font-medium text-black">
              {compactNumber.format(business.stats.favoriteCount)}
            </span>
            <span className="text-[13px] font-medium text-[#00000080]">
              Faved
            </span>
          </StatChip>
          <StatChip>
            <div className="text-[14px] leading-none">💵</div>
            <span className="text-[13px] font-medium text-black">
              ₦{formatCurrency(business.stats.averageSpend)}
            </span>
            <span className="text-[13px] font-medium text-[#00000080]">
              Avg Spend
            </span>
          </StatChip>
          <StatChip>
            <div className="text-[14px] leading-none">⭐️</div>
            <span className="text-[13px] font-medium text-black">
              {business.stats.averageRating.toFixed(1)}
            </span>
            <span className="text-[13px] font-medium text-[#00000080]">
              Rating
            </span>
          </StatChip>
          <StatChip>
            <div className="text-[14px] leading-none">📍</div>
            <span className="text-[13px] font-medium text-black">
              {business.locations.length}
            </span>
            <span className="text-[13px] font-medium text-[#00000080]">
              Locations
            </span>
          </StatChip>
          <StatChip>
            <div className="text-[14px] leading-none">🛍️</div>
            <span className="text-[13px] font-medium text-black">
              {compactNumber.format(business.stats.orderCount)}
            </span>
            <span className="text-[13px] font-medium text-[#00000080]">
              Orders
            </span>
          </StatChip>
        </div>

        {showRightArrow && (
          <button
            type="button"
            onClick={() => scrollStats(1)}
            className="absolute -right-2 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full border border-[#0000001A] bg-white p-1 shadow-md"
            aria-label="Scroll stats right"
          >
            <ChevronRight strokeWidth={2} size={12} />
          </button>
        )}
      </div>

      {business.businessDescription && (
        <p className="px-3 text-center text-sm font-medium text-[#000000B2]">
          {business.businessDescription}
        </p>
      )}

      {business.website && (
        <Link
          href={externalHref(business.website)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center justify-center text-sm font-bold text-black hover:underline"
        >
          {business.website} <ArrowUpRight size={16} className="ml-1" />
        </Link>
      )}

      <div className="mt-6 mb-6 flex items-center justify-center gap-2.5">
        {business.serialNumber ? (
          <Link
            href={`/pay/${business.serialNumber}`}
            className="flex h-11 min-w-[70px] items-center justify-center rounded-full bg-[#00C060] px-5 text-[15px] font-bold text-white shadow-xs transition-transform active:scale-95"
          >
            Pay
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="flex h-11 min-w-[70px] items-center justify-center rounded-full bg-[#00C060]/50 px-5 text-[15px] font-bold text-white opacity-50"
          >
            Pay
          </button>
        )}

        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={isFavoritePending}
          aria-label={isFavorite ? 'Remove from Saved' : 'Save to Faves'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-black shadow-xs transition-colors hover:bg-gray-50 active:scale-95 disabled:opacity-60"
        >
          {isFavoritePending ? (
            <span className="h-5 w-5">
              <LoaderCircle size={5} />
            </span>
          ) : (
            <Bookmark
              size={18}
              strokeWidth={2}
              className={isFavorite ? 'fill-black text-black' : 'text-black'}
            />
          )}
        </button>

        {business.serialNumber ? (
          <Link
            href={`/pay/${business.serialNumber}`}
            aria-label="Scan in store"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-black shadow-xs transition-colors hover:bg-gray-50 active:scale-95"
          >
            <ScanBarcode size={18} strokeWidth={2} />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-label="Scan in store"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-black/30 shadow-xs"
          >
            <ScanBarcode size={18} strokeWidth={2} />
          </button>
        )}

        {business.phoneNumber ? (
          <Link
            href={`tel:${business.phoneNumber}`}
            aria-label={`Call ${business.businessName}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-black shadow-xs transition-colors hover:bg-gray-50 active:scale-95"
          >
            <Phone size={18} strokeWidth={2} />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-label="No phone number"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-black/30 shadow-xs"
          >
            <Phone size={18} strokeWidth={2} />
          </button>
        )}

        {business.socialLinks?.whatsapp || business.phoneNumber ? (
          <Link
            href={
              business.socialLinks?.whatsapp
                ? externalHref(business.socialLinks.whatsapp)
                : `https://wa.me/${business.phoneNumber?.replace(/\D/g, '')}`
            }
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Chat with ${business.businessName}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-black shadow-xs transition-colors hover:bg-gray-50 active:scale-95"
          >
            <MessageCircle size={18} strokeWidth={2} />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-label="No chat link"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-black/30 shadow-xs"
          >
            <MessageCircle size={18} strokeWidth={2} />
          </button>
        )}

        <button
          type="button"
          onClick={() => void onShare()}
          aria-label="Share business profile"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-black shadow-xs transition-colors hover:bg-gray-50 active:scale-95"
        >
          <Share size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="-mx-4">
        <div
          className={cn(
            'sticky z-30 hide-scrollbar flex items-center justify-between overflow-x-auto border-b border-[#E5E7EB] bg-white px-2 transition-[top] duration-150',
            isScrolled ? 'top-13' : 'top-0',
          )}
          role="tablist"
          aria-label="Business profile sections"
        >
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.value
            return (
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={`relative shrink-0 px-3.5 py-3 text-[14px] whitespace-nowrap transition-colors ${
                  isActive
                    ? 'font-bold text-black'
                    : 'font-medium text-[#8E8E93] hover:text-black'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-full bg-black" />
                )}
              </button>
            )
          })}
        </div>

        {activeTab === 'items' && (
          <ItemsTab
            merchantId={business.id}
            serialNumber={business.serialNumber}
          />
        )}

        {activeTab === 'posts' && (
          <PostsTab
            merchantId={business.id}
            businessName={business.businessName}
          />
        )}

        {activeTab === 'about' && (
          <div className="overflow-hidden rounded-lg bg-white px-4">
            <AccordionSection
              title={`About ${business.businessName}`}
              hasContent={Boolean(business.businessDescription)}
            >
              <p className="text-sm font-medium text-[#000000B2]">
                {business.businessDescription ||
                  'No business description is available yet.'}
              </p>
            </AccordionSection>

            <AccordionSection
              title="Locations"
              hasContent={business.locations.length > 0}
            >
              {business.locations.length > 0 && (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {business.locations.map((location) => (
                    <div
                      key={location.id}
                      className="flex items-center gap-3 rounded-[8px] border border-[#0000001A] p-3"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          location.isPrimary ? 'bg-[#FB5012]' : 'bg-[#BFBFBF]'
                        }`}
                      >
                        <MapPin size={17} color="white" fill="white" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-black">
                          {location.name}
                        </p>
                        {(location.address || location.location) && (
                          <p className="text-xs font-medium text-[#00000080]">
                            {[location.address, location.location]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionSection>

            <AccordionSection
              title="Opening hours"
              hasContent={hasOpeningHours}
            >
              <OpeningHours business={business} />
            </AccordionSection>

            <AccordionSection title="Social links" hasContent={hasSocialLinks}>
              <div className="flex w-full items-center gap-6">
                <SocialLink
                  href={business.socialLinks.facebook}
                  src="/icons/fb.svg"
                  label="Facebook"
                />
                <SocialLink
                  href={business.socialLinks.whatsapp}
                  src="/icons/whatsapp.svg"
                  label="WhatsApp"
                />
                <SocialLink
                  href={business.socialLinks.instagram}
                  src="/icons/ig.svg"
                  label="Instagram"
                />
                <SocialLink
                  href={business.socialLinks.x}
                  src="/icons/twitter.svg"
                  label="X"
                />
                <SocialLink
                  href={business.socialLinks.tiktok}
                  src="/icons/tiktok.png"
                  label="TikTok"
                />
              </div>
            </AccordionSection>
          </div>
        )}

        {activeTab === 'activity' && <Activity business={business} />}
        {activeTab === 'feedback' && (
          <Feedback
            businessId={business.id}
            businessName={business.businessName}
          />
        )}
      </div>
    </div>
  )
}
