'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageCircle,
  Phone,
  ScanBarcode,
  Share,
} from 'lucide-react'
import { LoaderCircle } from '@/components/ui'
import type { PublicBusinessProfile } from '@/services/business-profile'
import { cn, formatCurrency } from '@/lib/utils'
import { externalHref } from '@/lib/utils/external-link'
import { useMerchantPosts } from '@/services/posts/hooks'
import { Activity } from './activity'
import { ItemsTab } from './items-tab'
import { Feedback } from './feedback'
import { AboutTab } from './about-tab'

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

function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-[6px] border border-[#0000001A] bg-white px-[8px] py-[7px]">
      {children}
    </div>
  )
}

/** A post's image, or the brand gradient when it has none or fails to load. */
function PostCover({ imageUrl, alt }: { imageUrl?: string; alt: string }) {
  const [failedUrl, setFailedUrl] = useState<string>()

  if (!imageUrl || failedUrl === imageUrl) {
    return (
      <div className="absolute inset-0 bg-linear-to-br from-[#FB5012] via-[#D72483] to-[#6D3CE8]" />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      onError={() => setFailedUrl(imageUrl)}
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
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
              <PostCover
                imageUrl={post.preview?.imageUrl}
                alt={post.caption || 'Post image'}
              />

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
          className="scrollbar-hide flex w-full items-center gap-2 overflow-x-auto scroll-smooth"
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
            // h-11 is relied on by the Items tab's sticky category row.
            'sticky z-30 scrollbar-hide flex h-11 items-stretch justify-between overflow-x-auto border-b border-[#E5E7EB] bg-white px-2 transition-[top] duration-150',
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
                className={`relative flex shrink-0 items-center px-3.5 text-[14px] whitespace-nowrap transition-colors ${
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
            businessId={business.id}
            serialNumber={business.serialNumber}
            isScrolled={isScrolled}
          />
        )}

        {activeTab === 'posts' && (
          <PostsTab
            merchantId={business.id}
            businessName={business.businessName}
          />
        )}

        {activeTab === 'about' && <AboutTab business={business} />}

        {activeTab === 'activity' && <Activity business={business} />}
        {activeTab === 'feedback' && (
          <Feedback
            businessId={business.id}
            businessName={business.businessName}
            serialNumber={business.serialNumber}
          />
        )}
      </div>
    </div>
  )
}
