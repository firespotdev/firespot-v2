'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from '@bprogress/next/app'
import {
  Banner,
  MerchantProfile,
  type BusinessTab,
} from '@/components/personal/business'
import {
  LoaderCircle,
  VerifiedBadge,
  showNotificationToast,
} from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import {
  useAddFavorite,
  useFavorites,
  useRemoveFavorite,
} from '@/services/favorites'
import { useBusinessProfile } from '@/services/business-profile'

function BusinessPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const identifier =
    searchParams.get('businessId') || searchParams.get('merchantSlug') || ''
  const [activeTab, setActiveTab] = useState<BusinessTab>('about')
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const profileQuery = useBusinessProfile(identifier)
  const favoritesQuery = useFavorites()
  const addFavorite = useAddFavorite()
  const removeFavorite = useRemoveFavorite()
  const business = profileQuery.data
  const isFavorite = Boolean(
    business &&
    favoritesQuery.data?.favorites.some(
      (favorite) => favorite.id === business.id,
    ),
  )
  const isFavoritePending = addFavorite.isPending || removeFavorite.isPending

  const toggleFavorite = () => {
    if (!business || isFavoritePending) return
    const mutation = isFavorite ? removeFavorite : addFavorite
    mutation.mutate(business.id, {
      onSuccess: () =>
        showNotificationToast({
          message: `${business.businessName} ${isFavorite ? 'removed from' : 'added to'} Faves`,
          mode: 'success',
        }),
      onError: () =>
        showNotificationToast({
          message: 'Could not update your Faves. Try again.',
          mode: 'error',
        }),
    })
  }

  const shareProfile = async () => {
    if (!business) return
    try {
      if (navigator.share) {
        await navigator.share({
          title: business.businessName,
          text: business.businessDescription,
          url: window.location.href,
        })
        return
      }
      await navigator.clipboard.writeText(window.location.href)
      showNotificationToast({
        message: 'Business profile link copied',
        mode: 'success',
      })
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        showNotificationToast({
          message: 'Could not share this business profile.',
          mode: 'error',
        })
      }
    }
  }

  if (profileQuery.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <LoaderCircle />
      </div>
    )
  }

  if (!identifier || profileQuery.isError || !business) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="text-[20px] font-bold text-black">
          Business profile unavailable
        </h1>
        <p className="mt-1 text-sm font-medium text-[#00000080]">
          This business may no longer be live or the profile link is invalid.
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="mt-6 h-11 rounded-full bg-black px-6 text-sm font-bold text-white"
        >
          Go back
        </button>
      </div>
    )
  }

  const openLocations = () =>
    openDrawer({
      type: 'business-locations',
      dismissible: true,
      props: {
        businessName: business.businessName,
        locations: business.locations,
      },
    })

  const openOptions = () =>
    openDrawer({
      type: 'business-options',
      dismissible: true,
      props: {
        business,
        isFavorite,
        onToggleFavorite: toggleFavorite,
        onViewActivity: () => setActiveTab('activity'),
        onViewFeedback: () => setActiveTab('feedback'),
        onViewAbout: () => setActiveTab('about'),
        onShare: shareProfile,
      },
    })

  const location = [business.mainAddress?.city, business.mainAddress?.state]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="min-h-dvh bg-white font-satoshi">
      <div className="mx-auto min-h-dvh max-w-125 bg-white">
        <Banner
          business={business}
          onBack={() => router.back()}
          onOptions={openOptions}
        />

        <main className="relative px-4 pt-6 pb-6">
          <div className="mx-auto max-w-[640px]">
            <div className="absolute -top-14 left-1/2 flex h-26.5 w-26.5 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-gray-200">
              {business.businessImageUrl ? (
                <Image
                  src={business.businessImageUrl}
                  alt={business.businessName}
                  width={96}
                  height={96}
                  priority
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src="/icons/store_solid.svg"
                  alt=""
                  width={96}
                  height={96}
                />
              )}
            </div>

            <div className="mt-8 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <h1 className="text-[20px] font-bold leading-none text-black">
                  {business.businessName}
                </h1>
                <VerifiedBadge level={business.verificationLevel} />
              </div>

              {(location || business.locations.length > 0) && (
                <div className="mt-2 flex items-center justify-center text-sm text-[#6B7280]">
                  {location && <span className="font-medium">{location}.</span>}
                  {business.locations.length > 0 && (
                    <button
                      type="button"
                      onClick={openLocations}
                      className="ml-1 flex items-center font-bold text-black"
                    >
                      See all locations
                      <ChevronDown className="ml-0.5 mt-0.5 h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <MerchantProfile
              business={business}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isFavorite={isFavorite}
              isFavoritePending={isFavoritePending}
              onToggleFavorite={toggleFavorite}
              onShare={shareProfile}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default function BusinessPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-white" />}>
      <BusinessPageContent />
    </Suspense>
  )
}
