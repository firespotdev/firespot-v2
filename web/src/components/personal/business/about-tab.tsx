'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui'
import { ScheduleList } from '@/components/shop/schedule-list'
import { SHOP_DAYS } from '@/components/shop/schedule-utils'
import { directionsHref, externalHref } from '@/lib/utils/external-link'
import type { ShopDaySchedule } from '@/services/auth/interface'
import type { PublicBusinessProfile } from '@/services/business-profile'
import { AboutLocations, locationDestination } from './about-locations'
import { AboutShopPolicies } from './about-shop-policies'
import { ProfileBottomBar } from './profile-bottom-bar'

interface AboutTabProps {
  business: PublicBusinessProfile
}

function AccordionSection({
  title,
  hasContent,
  children,
}: {
  title: string
  hasContent: boolean
  children: ReactNode
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

/** All seven days in order; days the merchant didn't set read as closed. */
function weekSchedule(business: PublicBusinessProfile): ShopDaySchedule[] {
  const saved = business.openingHours?.days ?? []
  return SHOP_DAYS.map(
    ({ value }) =>
      (saved.find((day) => day.day === value) as ShopDaySchedule) ?? {
        day: value,
        enabled: false,
        closesNextDay: false,
      },
  )
}

/** The About tab customers see on a business profile. */
export function AboutTab({ business }: AboutTabProps) {
  const hasOpeningHours = Boolean(
    business.openingHours?.days.some((day) => day.enabled),
  )
  const hasSocialLinks = Object.values(business.socialLinks).some(Boolean)
  const primary =
    business.locations.find((location) => location.isPrimary) ||
    business.locations[0]
  const primaryAddress = primary
    ? [primary.address, primary.location].filter(Boolean).join(', ')
    : ''

  return (
    <>
      <div className="overflow-hidden rounded-lg bg-white px-4 pb-28">
        <AccordionSection
          title={`About ${business.businessName}`}
          hasContent={Boolean(business.businessDescription)}
        >
          <p className="text-sm font-medium text-[#000000B2]">
            {business.businessDescription}
          </p>
        </AccordionSection>

        <AccordionSection
          title="Locations"
          hasContent={business.locations.length > 0}
        >
          <AboutLocations business={business} />
        </AccordionSection>

        <AccordionSection
          title="Shop policies"
          hasContent={Boolean(business.shopPolicies)}
        >
          {business.shopPolicies && (
            <AboutShopPolicies policies={business.shopPolicies} />
          )}
        </AccordionSection>

        <AccordionSection title="Opening hours" hasContent={hasOpeningHours}>
          <ScheduleList days={weekSchedule(business)} accent />
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

      {primary && (
        <ProfileBottomBar
          businessId={business.id}
          serialNumber={business.serialNumber}
          title="Main address"
          subtitle={primaryAddress || primary.name}
          action={
            <Button asChild className="h-11 w-auto rounded-full px-6">
              <a
                href={directionsHref(
                  locationDestination(primary, business.mapLocation),
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions
              </a>
            </Button>
          }
        />
      )}
    </>
  )
}
