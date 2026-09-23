'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowUpRight,
  Banknote,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Share,
  ShoppingBag,
  Star,
  Store,
  UserRound,
} from 'lucide-react'
import { LoaderCircle } from '@/components/ui'
import type { PublicBusinessProfile } from '@/services/business-profile'
import { formatCurrency } from '@/lib/utils'
import { Activity } from './activity'
import { Feedback } from './feedback'

export type BusinessTab = 'about' | 'activity' | 'feedback'

interface MerchantProfileProps {
  business: PublicBusinessProfile
  activeTab: BusinessTab
  onTabChange: (tab: BusinessTab) => void
  isFavorite: boolean
  isFavoritePending: boolean
  onToggleFavorite: () => void
  onShare: () => Promise<void>
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

export function MerchantProfile({
  business,
  activeTab,
  onTabChange,
  isFavorite,
  isFavoritePending,
  onToggleFavorite,
  onShare,
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
    { value: 'about', label: 'About' },
    { value: 'activity', label: 'Activity' },
    { value: 'feedback', label: 'Feedback' },
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

      <div className="mt-10 mb-4 flex justify-center gap-2">
        {business.serialNumber && (
          <Link
            href={`/pay/${business.serialNumber}`}
            className="flex h-11 w-full items-center justify-center rounded-full bg-black px-6 py-2 text-center text-[15px] font-medium text-white"
          >
            Pay
          </Link>
        )}
        <button
          type="button"
          onClick={onToggleFavorite}
          disabled={isFavoritePending}
          aria-label={isFavorite ? 'Remove from Faves' : 'Add to Faves'}
          className={`flex min-w-11 items-center justify-center rounded-full p-2 disabled:opacity-60 ${
            isFavorite ? 'bg-[#FF002E1A]' : 'border border-[#0000001F] bg-white'
          }`}
        >
          {isFavoritePending ? (
            <span className="h-6 w-6">
              <LoaderCircle size={6} />
            </span>
          ) : (
            <Heart
              color={isFavorite ? '#FF002E' : 'currentColor'}
              fill={isFavorite ? '#FF002E' : 'none'}
              size={24}
              strokeWidth={1.5}
            />
          )}
        </button>
        {business.phoneNumber && (
          <>
            <Link
              href={`tel:${business.phoneNumber}`}
              aria-label={`Call ${business.businessName}`}
              className="flex min-w-11 items-center justify-center rounded-full border border-[#0000001F] bg-white p-2"
            >
              <Phone size={24} strokeWidth={1.5} />
            </Link>
            <Link
              href={`sms:${business.phoneNumber}`}
              aria-label={`Message ${business.businessName}`}
              className="flex min-w-11 items-center justify-center rounded-full border border-[#0000001F] bg-white p-2"
            >
              <MessageCircle size={24} strokeWidth={1.5} />
            </Link>
          </>
        )}
        <button
          type="button"
          onClick={() => void onShare()}
          aria-label="Share business profile"
          className="flex min-w-11 items-center justify-center rounded-full border border-[#0000001F] bg-white p-2"
        >
          <Share size={24} strokeWidth={1.5} />
        </button>
      </div>

      <div className="-mx-4">
        <div
          className="flex justify-center border-b border-[#F1F1F1]"
          role="tablist"
          aria-label="Business profile sections"
        >
          {tabItems.map((tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === tab.value}
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={`relative flex-1 px-3 py-3 text-[13px] font-bold ${
                activeTab === tab.value ? 'text-black' : 'text-[#00000066]'
              }`}
            >
              {tab.label}
              {activeTab === tab.value && (
                <span className="absolute inset-x-[28%] bottom-0 h-0.5 bg-black" />
              )}
            </button>
          ))}
        </div>

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
