'use client'

import { ChevronRight, MapPin } from 'lucide-react'
import { MapTrifoldIcon, StorefrontIcon } from '@phosphor-icons/react'
import { VerifiedBadge } from '@/components/ui'
import { directionsHref, mapEmbedSrc } from '@/lib/utils/external-link'
import type {
  BusinessLocation,
  PublicBusinessProfile,
} from '@/services/business-profile'

interface AboutLocationsProps {
  business: PublicBusinessProfile
}

const locationAddress = (location: BusinessLocation) =>
  [location.address, location.location].filter(Boolean).join(', ')

/** Where directions to a spot point: the pinned main spot, else its address. */
export function locationDestination(
  location: BusinessLocation,
  mapLocation: PublicBusinessProfile['mapLocation'],
) {
  return location.isPrimary && mapLocation
    ? mapLocation
    : locationAddress(location) || location.name
}

function LocationRow({
  location,
  verificationLevel,
  icon,
  subtitle,
  href,
}: {
  location: BusinessLocation
  verificationLevel: PublicBusinessProfile['verificationLevel']
  icon: React.ReactNode
  subtitle: string
  href: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 active:bg-black/[0.03]"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="truncate text-[15px] font-bold text-[#111827]">
            {location.name}
          </span>
          <VerifiedBadge level={verificationLevel} />
        </span>
        <span className="mt-0.5 block truncate text-[13px] font-medium text-[#6B7280]">
          {subtitle}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" />
    </a>
  )
}

/** The business's spots: a map of the main one, then the others. */
export function AboutLocations({ business }: AboutLocationsProps) {
  const primary =
    business.locations.find((location) => location.isPrimary) ||
    business.locations[0]
  if (!primary) return null

  const others = business.locations.filter(
    (location) => location.id !== primary.id,
  )
  const primaryDestination = locationDestination(primary, business.mapLocation)
  const embedSrc = mapEmbedSrc(primaryDestination)

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[16px] border border-[#F1F1F1] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
        {embedSrc && (
          <a
            href={directionsHref(primaryDestination)}
            target="_blank"
            rel="noopener noreferrer"
            className="relative m-1.5 block h-40 overflow-hidden rounded-[12px] bg-[#E6E8EB]"
          >
            <iframe
              src={embedSrc}
              title={`Map of ${primary.name}`}
              loading="lazy"
              className="pointer-events-none h-full w-full border-0"
            />
            <span className="absolute top-1/2 left-1/2 flex h-10 -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white px-4 text-[10px] font-bold tracking-[1px] text-black shadow-[0px_4px_8px_0px_#00000014]">
              <MapTrifoldIcon size={18} />
              GET DIRECTIONS
            </span>
          </a>
        )}
        <LocationRow
          location={primary}
          verificationLevel={business.verificationLevel}
          href={directionsHref(primaryDestination)}
          subtitle="You're here · Main address"
          icon={
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EB5B2D]">
              <MapPin size={18} color="white" fill="white" />
            </span>
          }
        />
      </div>

      {others.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-medium text-[#6B7280]">
            Other Spots
          </p>
          <div className="divide-y divide-[#F1F1F1] overflow-hidden rounded-[16px] border border-[#F1F1F1] bg-white shadow-[0px_4px_8px_0px_#0000000A]">
            {others.map((location) => (
              <LocationRow
                key={location.id}
                location={location}
                verificationLevel={business.verificationLevel}
                href={directionsHref(
                  locationDestination(location, business.mapLocation),
                )}
                subtitle={locationAddress(location) || 'Address not added'}
                icon={
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#9CA3AF]">
                    <StorefrontIcon size={18} weight="fill" color="white" />
                  </span>
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
