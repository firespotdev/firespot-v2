'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from '@bprogress/next/app'
import { ArrowLeft, Bookmark, MapPin } from 'lucide-react'
import { MerchantAvatar } from '@/components/layout'
import {
  PlacesFilterBar,
  type PlacesDateRange,
  type PlacesVisitType,
} from '@/components/places'
import {
  EmptyState,
  LoaderCircle,
  VerifiedBadge,
  showNotificationToast,
} from '@/components/ui'
import { useCustomerHistory } from '@/services/sales/hooks'
import { useAuthStore } from '@/services/auth'
import {
  useCurrentLocation,
  useFavoriteMerchants,
  useUpdateCurrentLocation,
  useUpdateFavoriteMerchant,
} from '@/services/users'
import { getCurrentBrowserLocation } from '@/lib/utils/current-location'
import {
  formatMerchantLocation,
  resolveSaleMerchant,
} from '@/lib/utils/customer-sale'
import { formatRelativeDate } from '@/lib/utils/date-time'
import { Sort } from 'iconsax-reactjs'

interface VisitedMerchant {
  id: string
  businessName: string
  businessImageUrl?: string
  serialNumber?: string
  locationLabel: string
  verificationLevel?: 'PRO' | 'PROMAX' | null
  visitType: Exclude<PlacesVisitType, 'all'>
  lastVisitedAt: number
}

export default function PlacesPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const { data: sales, isLoading, isError } = useCustomerHistory()
  const currentLocation = useCurrentLocation()
  const updateCurrentLocation = useUpdateCurrentLocation()
  const favorites = useFavoriteMerchants()
  const updateFavorite = useUpdateFavoriteMerchant()
  const [locationFilter, setLocationFilter] = useState('all')
  const [visitType, setVisitType] = useState<PlacesVisitType>('all')
  const [dateRange, setDateRange] = useState<PlacesDateRange>('all')
  const [filterNow] = useState(() => Date.now())

  const places = useMemo(() => {
    const merchants = new Map<string, VisitedMerchant>()

    for (const sale of sales || []) {
      const merchant = resolveSaleMerchant(sale)
      if (!merchant.id) continue

      const lastVisitedAt = new Date(
        sale.recordedAt || sale.createdAt,
      ).getTime()
      const saleVisitType =
        sale.source === 'Link shared' ? 'online' : 'in-person'
      const existing = merchants.get(merchant.id)
      if (existing && existing.lastVisitedAt >= lastVisitedAt) continue

      merchants.set(merchant.id, {
        id: merchant.id,
        businessName: merchant.businessName || 'Merchant',
        businessImageUrl: merchant.businessImageUrl || merchant.profilePhotoUrl,
        serialNumber: sale.serialNumber || existing?.serialNumber,
        locationLabel:
          saleVisitType === 'online'
            ? 'Visited online'
            : formatMerchantLocation(merchant.mainAddress),
        verificationLevel: merchant.verificationLevel,
        visitType: saleVisitType,
        lastVisitedAt,
      })
    }

    return Array.from(merchants.values()).sort(
      (a, b) => b.lastVisitedAt - a.lastVisitedAt,
    )
  }, [sales])

  const locationOptions = useMemo(() => {
    const labels = Array.from(
      new Set(
        places
          .filter((place) => place.visitType === 'in-person')
          .map((place) => place.locationLabel),
      ),
    )
    return [
      { label: 'LOCATION', value: 'all' },
      ...labels.map((label) => ({ label: label.toUpperCase(), value: label })),
    ]
  }, [places])

  const filteredPlaces = useMemo(() => {
    const cutoffDays = dateRange === 'all' ? null : Number(dateRange)
    const cutoff = cutoffDays
      ? filterNow - cutoffDays * 24 * 60 * 60 * 1000
      : null

    return places.filter((place) => {
      if (locationFilter !== 'all' && place.locationLabel !== locationFilter) {
        return false
      }
      if (visitType !== 'all' && place.visitType !== visitType) return false
      if (cutoff !== null && place.lastVisitedAt < cutoff) return false
      return true
    })
  }, [dateRange, filterNow, locationFilter, places, visitType])

  const favoriteIds = useMemo(
    () => new Set((favorites.data?.favorites || []).map((item) => item.id)),
    [favorites.data?.favorites],
  )

  const savedLocation = currentLocation.data?.location
  const persistedCoordinates = user?.personalLocation?.coordinates
  const mapCoordinates = savedLocation
    ? {
        latitude: savedLocation.latitude,
        longitude: savedLocation.longitude,
      }
    : persistedCoordinates
      ? {
          latitude: persistedCoordinates[1],
          longitude: persistedCoordinates[0],
        }
      : null
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY
  const mapUrl =
    mapCoordinates && mapsKey
      ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapsKey)}&q=${mapCoordinates.latitude},${mapCoordinates.longitude}&zoom=15&maptype=roadmap`
      : null

  const handleUseCurrentLocation = async () => {
    try {
      const browserLocation = await getCurrentBrowserLocation()
      await updateCurrentLocation.mutateAsync(browserLocation)
    } catch {
      showNotificationToast({
        message:
          'Could not update your location. Check browser permissions and try again.',
        mode: 'error',
      })
    }
  }

  const resetFilters = () => {
    setLocationFilter('all')
    setVisitType('all')
    setDateRange('all')
  }

  const hasActiveFilters =
    locationFilter !== 'all' || visitType !== 'all' || dateRange !== 'all'

  return (
    <div className="min-h-dvh bg-linear-to-b from-[#fffff] to-[#f4f6f8] text-[#111827]">
      <div className="mx-auto min-h-dvh w-full max-w-125 pb-28">
        <header className="h-13 flex justify-between items-center bg-white px-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex items-center justify-center rounded-full transition-colors active:bg-[#F1F1F1]"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <h1 className="text-center text-[16px] font-medium tracking-[-0.4px] text-[#4B4B4B]">
            <span className="font-bold text-[#F23F4F]">Places</span> you’ve
            visited
          </h1>
          <button
            type="button"
            onClick={resetFilters}
            aria-label={
              hasActiveFilters ? 'Clear place filters' : 'Place filters'
            }
            className="relative flex items-center justify-center rounded-full transition-colors active:bg-[#F1F1F1]"
          >
            <Sort className="h-6 w-6" strokeWidth={2} />
          </button>
        </header>

        <PlacesFilterBar
          location={locationFilter}
          locationOptions={locationOptions}
          visitType={visitType}
          dateRange={dateRange}
          onLocationChange={setLocationFilter}
          onVisitTypeChange={setVisitType}
          onDateRangeChange={setDateRange}
        />

        <main className="px-3 pt-2">
          <section className="h-[168px] overflow-hidden rounded-[12px] border-4 border-white bg-[#E9EDF2] shadow-[0px_4px_8px_0px_#0000000A]">
            {mapUrl ? (
              <iframe
                title={`Map centered on ${savedLocation?.label || 'your location'}`}
                src={mapUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full w-full border-0"
              />
            ) : currentLocation.isLoading && !mapCoordinates ? (
              <div className="flex h-full items-center justify-center">
                <LoaderCircle innerBg="#E9EDF2" />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <MapPin className="h-7 w-7 text-[#647084]" />
                <p className="mt-2 text-sm font-bold text-black">
                  {mapCoordinates
                    ? 'Map is not configured'
                    : 'Add your location'}
                </p>
                <p className="mt-1 text-xs font-medium leading-[125%] text-[#647084]">
                  {mapCoordinates
                    ? savedLocation?.label || 'Your saved location'
                    : 'Use your current location to center this map.'}
                </p>
                {!mapCoordinates && (
                  <button
                    type="button"
                    onClick={() => void handleUseCurrentLocation()}
                    disabled={updateCurrentLocation.isPending}
                    className="mt-3 min-h-9 rounded-full bg-black px-4 text-[10px] font-bold tracking-[1px] text-white disabled:opacity-50"
                  >
                    {updateCurrentLocation.isPending
                      ? 'FINDING LOCATION…'
                      : 'USE CURRENT LOCATION'}
                  </button>
                )}
              </div>
            )}
          </section>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoaderCircle innerBg="#F7F8FA" />
            </div>
          ) : isError ? (
            <p className="py-16 text-center text-sm font-medium text-[#00000080]">
              Couldn’t load your places. Try again later.
            </p>
          ) : filteredPlaces.length === 0 ? (
            <div className="flex min-h-[320px] items-center">
              <EmptyState
                emoji={<MapPin className="h-12 w-12 text-[#9CA3AF]" />}
                title={
                  hasActiveFilters
                    ? 'No places match'
                    : "You haven't visited anywhere"
                }
                details={
                  hasActiveFilters
                    ? 'Try clearing one or more filters.'
                    : "Shops you've paid through Firespot will appear here."
                }
                cta={
                  hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-5 h-9 rounded-full bg-black px-5 text-[10px] font-bold tracking-[1px] text-white"
                    >
                      CLEAR FILTERS
                    </button>
                  ) : null
                }
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-1">
              {filteredPlaces.map((merchant) => {
                const isFavorite = favoriteIds.has(merchant.id)
                const isUpdatingFavorite =
                  updateFavorite.isPending &&
                  updateFavorite.variables?.merchantId === merchant.id
                const content = (
                  <>
                    <span className="rounded-full bg-linear-to-br from-[#FB5012] to-[#D72483] p-[2px]">
                      <span className="block rounded-full bg-white p-[2px]">
                        <MerchantAvatar
                          profilePhotoUrl={merchant.businessImageUrl}
                          alt={merchant.businessName}
                          size={40}
                        />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span className="truncate text-[14px] font-bold text-[#111827]">
                          {merchant.businessName}
                        </span>
                        <VerifiedBadge
                          level={merchant.verificationLevel}
                          className="[&_svg]:h-4 [&_svg]:w-4"
                        />
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] font-medium text-[#00000080]">
                        {merchant.locationLabel} ·{' '}
                        {formatRelativeDate(merchant.lastVisitedAt)}
                      </span>
                    </span>
                  </>
                )

                return (
                  <li key={merchant.id} className="flex items-center gap-3">
                    {merchant.serialNumber ? (
                      <Link
                        href={`/pay/${merchant.serialNumber}`}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-3 py-2">
                        {content}
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={
                        isFavorite
                          ? `Remove ${merchant.businessName} from saved places`
                          : `Save ${merchant.businessName}`
                      }
                      disabled={isUpdatingFavorite}
                      onClick={() =>
                        updateFavorite.mutate(
                          { merchantId: merchant.id, isFavorite },
                          {
                            onError: () =>
                              showNotificationToast({
                                message:
                                  'Could not update saved places. Try again.',
                                mode: 'error',
                              }),
                          },
                        )
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F1F1] transition-colors active:bg-[#F1F1F1] disabled:opacity-50"
                    >
                      <Bookmark
                        size={16}
                        className="text-black"
                        fill={isFavorite ? 'currentColor' : 'none'}
                        strokeWidth={2}
                      />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </main>
      </div>
    </div>
  )
}
