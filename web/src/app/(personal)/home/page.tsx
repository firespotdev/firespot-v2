'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Mic, Ghost } from 'lucide-react'
import { useAuthStore } from '@/services/auth'
import { useDrawerStore } from '@/services/drawer'
import { PostCard } from '@/components/posts/post-card'
import { usePostsFeed } from '@/services/posts/hooks'
import type { PostFeedMode } from '@/services/posts'
import { PageHeader } from '@/components/layout/PageHeader'
import { LoaderCircle } from '@/components/ui'
import {
  useCurrentLocation,
  useUpdateCurrentLocation,
  useUserProfile,
} from '@/services/users'
import { getCurrentBrowserLocation } from '@/lib/utils/current-location'
import { GhostIcon, MapPinIcon } from '@phosphor-icons/react'

const QUICK_ACTIONS = [
  { label: 'Shops', icon: '/icons/shop.svg', href: '/search?type=shops' },
  {
    label: 'Products',
    icon: '/icons/product.svg',
    href: '/search?type=products',
  },
  { label: 'Places', icon: '/icons/places.svg', href: '/places' },
]

const FILTER_PILLS = [
  { label: 'Latest', mode: 'latest' },
  { label: 'Open now', mode: 'open_now', accent: true },
  { label: 'Nearby', mode: 'nearby' },
] satisfies Array<{ label: string; mode: PostFeedMode; accent?: boolean }>

interface CustomerLocation {
  latitude: number
  longitude: number
}

function HomePageContent() {
  const searchParams = useSearchParams()
  const isHandlingIntro = useRef(false)
  const user = useAuthStore((state) => state.user)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const [activeMode, setActiveMode] = useState<PostFeedMode>('latest')
  const [customerLocation, setCustomerLocation] =
    useState<CustomerLocation | null>(null)
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'requesting' | 'denied' | 'unavailable'
  >('idle')
  const { data: profile, isLoading: isProfileLoading } = useUserProfile()
  const currentLocation = useCurrentLocation()
  const updateCurrentLocation = useUpdateCurrentLocation()
  const savedLocation = currentLocation.data?.location
  const persistedCoordinates =
    profile?.personalLocation?.coordinates ??
    user?.personalLocation?.coordinates
  const savedCoordinates =
    savedLocation?.longitude !== undefined &&
    savedLocation.latitude !== undefined
      ? [savedLocation.longitude, savedLocation.latitude]
      : persistedCoordinates
  const hasPersistedLocation = Boolean(savedCoordinates)
  const activeLocation =
    customerLocation ??
    (savedCoordinates
      ? { latitude: savedCoordinates[1], longitude: savedCoordinates[0] }
      : null)
  const needsLocation = activeMode !== 'latest'
  const postsFeed = usePostsFeed(
    {
      mode: activeMode,
      latitude: needsLocation ? activeLocation?.latitude : undefined,
      longitude: needsLocation ? activeLocation?.longitude : undefined,
    },
    !needsLocation || Boolean(activeLocation),
  )
  const posts = postsFeed.data?.data || []

  useEffect(() => {
    const isIntro = searchParams.get('businessIntro') === '1'
    if (isIntro && !isHandlingIntro.current) {
      isHandlingIntro.current = true
      openDrawer({ type: 'business-intro' })
      window.history.replaceState(null, '', window.location.pathname)
    } else if (!isIntro) {
      isHandlingIntro.current = false
    }
  }, [openDrawer, searchParams])

  // Auth + onboarding are enforced by the (personal) route-group layout.

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.businessName ||
    user?.fullPhoneNumber ||
    ''

  const handleAccountSwitch = () => {
    openDrawer({ type: 'account-switch', props: { mode: 'personal' } })
  }

  const requestLocation = async (
    nextMode: PostFeedMode = 'nearby',
    forceUpdate = false,
  ) => {
    setActiveMode(nextMode)
    if (!forceUpdate && activeLocation) return
    if (locationStatus === 'requesting') return

    setLocationStatus('requesting')
    try {
      const location = await getCurrentBrowserLocation()
      const result = await updateCurrentLocation.mutateAsync(location)
      if (result.location) {
        setCustomerLocation({
          latitude: result.location.latitude,
          longitude: result.location.longitude,
        })
      }
      setLocationStatus('idle')
    } catch (error) {
      const permissionDenied =
        error !== null &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 1
      setLocationStatus(permissionDenied ? 'denied' : 'unavailable')
    }
  }

  const locationSubtitle =
    locationStatus === 'requesting' ? (
      'Finding your location…'
    ) : savedLocation ? (
      <span className="flex max-w-full items-center gap-1">
        <span className="truncate leading-[125%]">{savedLocation.label}</span>
      </span>
    ) : currentLocation.isLoading || isProfileLoading ? (
      <span
        role="status"
        aria-label="Loading saved location"
        className="block h-3 w-28 animate-pulse rounded-full bg-[#E5E7EB]"
      />
    ) : hasPersistedLocation ? (
      'Saved location unavailable'
    ) : (
      'Tap to allow location access'
    )
  const canRequestLocationFromHeader =
    !currentLocation.isLoading && !isProfileLoading && !hasPersistedLocation

  return (
    <div className="min-h-dvh bg-linear-to-b from-[#ffffff] to-[#f4f6f8]">
      <div className="max-w-125 mx-auto pb-28">
        <PageHeader
          title={displayName}
          subtitle={locationSubtitle}
          showDropdown
          onTitleClick={handleAccountSwitch}
          onSubtitleClick={
            canRequestLocationFromHeader
              ? () => void requestLocation('nearby', true)
              : undefined
          }
          logoSrc="/images/firespot_personal.png"
          className="bg-white"
        />

        {/* Search */}
        <div className="px-3 mt-2">
          <Link
            href="/search"
            className="w-full h-9 bg-[#F3F4F6] border border-[#F1F1F1] rounded-full flex items-center gap-2 px-4"
          >
            <Search className="w-4 h-4 text-[#00000033]" />
            <span className="flex-1 text-left text-[14px] text-[#00000066]">
              Find anything on Firespot
            </span>
            <Mic className="w-4 h-4 text-[#9CA3AF]" />
          </Link>
        </div>

        <div className="flex gap-4 px-5 mt-5">
          {QUICK_ACTIONS.map(({ label, icon, href }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-[#FBEEEE]">
                <Image src={icon} alt="" width={32} height={32} />
              </span>
              <span className="text-xs text-black">{label}</span>
            </Link>
          ))}
        </div>

        <div className="px-3">
          <div className="flex gap-2 mt-4 pt-3 overflow-x-auto scrollbar-hide border-t border-[#F1F1F1]">
            {FILTER_PILLS.map(({ label, mode, accent }) => {
              const isActive = activeMode === mode
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    mode === 'latest'
                      ? setActiveMode('latest')
                      : void requestLocation(mode)
                  }
                  className={`shrink-0 px-4 h-9 rounded-full font-medium text-sm flex items-center transition-colors ${
                    isActive
                      ? 'bg-black text-white'
                      : accent
                        ? 'border border-[#24C16633] bg-[#24C1661A] text-[#33A061]'
                        : 'bg-[#EEEFF2] text-black'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {needsLocation && !activeLocation ? (
          <div className="px-8 pb-10 pt-16 text-center">
            {locationStatus === 'requesting' ? (
              <div className="flex justify-center py-12">
                <LoaderCircle />
              </div>
            ) : (
              <>
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#E5E7EB] bg-[#F3F4F6]">
                  <GhostIcon size={32} color="#9CA3AF" />
                </span>
                <p className="mt-4 text-sm font-bold text-black">
                  {locationStatus === 'denied'
                    ? 'Location access is off'
                    : locationStatus === 'unavailable'
                      ? 'Location is unavailable'
                      : 'See what’s around you'}
                </p>
                <p className="mx-auto mt-1 max-w-82 text-[13px] font-medium leading-[125%] text-[#6B7280]">
                  {locationStatus === 'denied'
                    ? 'Allow location access in your browser settings, then try again.'
                    : locationStatus === 'unavailable'
                      ? 'We could not find your current location. Check your connection and browser settings, then try again.'
                      : 'Firespot shows vendors near you. Your location is never shared with anyone.'}
                </p>
                <button
                  type="button"
                  onClick={() => void requestLocation(activeMode)}
                  className="mt-4 inline-flex h-9 border border-[#DFDFDF80] items-center gap-2 rounded-full bg-[#F1F1F1] px-4 text-[10px] font-bold tracking-[1px] text-black"
                >
                  <MapPinIcon size={16} />
                  ALLOW LOCATION
                </button>
              </>
            )}
          </div>
        ) : postsFeed.isLoading ? (
          <div
            role="status"
            aria-label="Loading posts"
            className="grid grid-cols-2 gap-3 border-t border-[#F1F3F5] px-4 pb-10 pt-4"
          >
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="aspect-[0.63] animate-pulse rounded-[14px] bg-[#F1F3F5]"
              />
            ))}
          </div>
        ) : postsFeed.isError ? (
          <div className="border-t border-[#F1F3F5] px-8 pb-10 pt-12 text-center">
            <p className="text-sm font-medium text-[#00000080]">
              Posts could not load right now.
            </p>
            <button
              type="button"
              onClick={() => void postsFeed.refetch()}
              className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-full bg-black px-6 text-sm font-bold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              Retry
            </button>
          </div>
        ) : posts.length ? (
          <section className="px-3 pb-10 pt-4">
            <div className="grid grid-cols-2 gap-3">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} interactive={false} />
              ))}
            </div>
          </section>
        ) : (
          <div className="border-t border-[#F1F3F5] px-8 pb-10 pt-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[12px] bg-[#F1F1F1]">
              <Ghost className="h-7 w-7 text-[#9CA3AF]" strokeWidth={1.5} />
            </span>
            <p className="mt-6 text-base font-bold text-black">
              {activeMode === 'open_now'
                ? 'No open shops nearby'
                : activeMode === 'nearby'
                  ? 'No posts near you'
                  : 'No new posts from shops'}
            </p>
            <p className="mt-1 text-sm text-[#00000080]">
              {activeMode === 'latest'
                ? 'New shop updates will appear here.'
                : 'Try checking again later or switch to Latest.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-white" />}>
      <HomePageContent />
    </Suspense>
  )
}
