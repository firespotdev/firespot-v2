'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { PageHeader } from '@/components/layout/PageHeader'
import { useUserProfile, useUpdateProfilePhoto } from '@/services/users'
import { useAuthStore } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { LoaderCircle } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import { useMerchantInsights, type InsightsQuery } from '@/services/insights'
import { useUserQRKits } from '@/services/qr'
import { useSalesStats, useSales } from '@/services/sales/hooks'
import Link from 'next/link'
import { sortBankAccounts } from '@/lib/utils/bank-registry'
import { MerchantInfoStat } from '@/components/profile/merchant-info-stat'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export default function ProfilePage() {
  const router = useRouter()
  const [filter, setFilter] = useState<InsightsQuery>({
    preset: 'today',
  })
  const { data: profile, isLoading } = useUserProfile()
  const { data: insights } = useMerchantInsights({ preset: 'today' })
  const { data: qrKitsData } = useUserQRKits()
  const { data: salesStats } = useSalesStats(filter)
  const { data: collectedStats } = useSalesStats({
    ...filter,
    mode: 'collected',
  })
  const { data: recordedStats } = useSalesStats({ ...filter, mode: 'recorded' })
  const { data: owingSales } = useSales({ status: 'OWING', limit: 1 })
  const updateProfilePhoto = useUpdateProfilePhoto()
  const hasQRKits = (qrKitsData?.data?.length ?? 0) > 0
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoSuccess, setPhotoSuccess] = useState(false)
  const [isAmountHidden, setIsAmountHidden] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Clear photo success message after 3 seconds
  useEffect(() => {
    if (photoSuccess) {
      const timer = setTimeout(() => setPhotoSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [photoSuccess])

  if (!isAuthenticated) {
    return null
  }

  const sortedBankAccounts = sortBankAccounts(profile?.bankAccounts || [])

  const handleCameraClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPhotoError(null)

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setPhotoError('Please select a JPG, PNG, or WEBP image')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setPhotoError('Image must be less than 5MB')
      return
    }

    // Upload the file
    updateProfilePhoto.mutate(file, {
      onSuccess: () => {
        setPhotoSuccess(true)
      },
      onError: (error: any) => {
        const message =
          error?.response?.data?.message || 'Failed to upload photo'
        setPhotoError(message)
      },
    })

    // Reset the input so the same file can be selected again
    e.target.value = ''
  }

  const handleShareClick = () => {
    if (qrKitsData?.data[0]?.serialNumber) {
      openDrawer({
        type: 'profile-share',
        props: {
          businessName: profile?.businessName || 'Your Business',
          serialNumber: qrKitsData.data[0].serialNumber,
          profilePhotoUrl: profile?.profilePhotoUrl,
        },
      })
    } else {
      openDrawer({
        type: 'obtain-kit',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="h-dvh bg-[#F4F6F8] flex items-center justify-center">
        <LoaderCircle innerBg="#F4F6F8" />
      </div>
    )
  }

  return (
    <div className="h-dvh bg-[#F4F6F8] overflow-hidden">
      <div className="max-w-125 mx-auto h-full flex flex-col font-satoshi">
        <PageHeader
          title="Pay"
          showDropdown
          onLogoClick={() => openDrawer({ type: 'profile-menu' })}
          onTitleClick={() =>
            openDrawer({
              type: 'bank-accounts',
              props: {
                bankAccounts: sortedBankAccounts,
              },
            })
          }
          onShareClick={handleShareClick}
        />

        <div className="flex-1 px-4 pb-32 flex flex-col justify-evenly overflow-y-auto">
          {/* Hidden file input for photo upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Merchant Card Carousel */}
          {sortedBankAccounts.length > 0 && (
            <MerchantInfoStat
              merchantInfo={{
                profilePhotoUrl: profile?.profilePhotoUrl,
                businessName: profile?.businessName || 'Your Business Name',
                bankAccountCount: sortedBankAccounts.length,
              }}
              showCameraButton={true}
              onCameraClick={handleCameraClick}
              isUploadingPhoto={updateProfilePhoto.isPending}
              todaySalesAmount={salesStats?.todaySalesAmount ?? 0}
              collectedAmount={collectedStats?.todaySalesAmount ?? 0}
              recordedAmount={recordedStats?.todaySalesAmount ?? 0}
              salesCount={salesStats?.todaySalesCount ?? 0}
              ordersCount={insights?.qrKitScans?.totalScans ?? 0}
              unconfirmedCount={salesStats?.pendingSalesCount ?? 0}
              owingCount={owingSales?.pagination?.total ?? 0}
              isAmountHidden={isAmountHidden}
              onToggleVisibility={() => setIsAmountHidden((prev) => !prev)}
              currentFilter={filter}
              onFilterChange={setFilter}
              qrKitStatus={
                !hasQRKits ? (
                  <Button
                    variant="link"
                    onClick={() => openDrawer({ type: 'obtain-kit' })}
                    className="text-sm text-[#00000080] h-6 font-medium p-0 flex items-center gap-1"
                  >
                    1 more step: Activate your QR kit{' '}
                    <ChevronRight className="w-4 h-4 text-[#747576]" />
                  </Button>
                ) : (
                  <Link
                    href="/qr-kits"
                    className="mt-1 text-sm text-[#24C166] font-medium flex items-center gap-1"
                  >
                    <Image
                      src="/icons/ping.svg"
                      alt="live ping"
                      width={16}
                      height={16}
                      className="animate-pulse"
                    />
                    Your QR kit is active
                    <ChevronRight className="w-4 h-4 text-[#24C166] mt-[1%]" />
                  </Link>
                )
              }
            />
          )}

          {/* Photo error message */}
          {photoError && (
            <p className="text-xs text-red-500 mt-2 text-center">
              {photoError}
            </p>
          )}

          {/* Photo success message */}
          {photoSuccess && (
            <p className="text-xs text-green-600 mt-2 text-center">
              Photo updated successfully!
            </p>
          )}

          {/* Stats Section - Link to Insights, Recents, and Owing */}
          <div className="grid grid-cols-4 gap-2 w-full text-center">
            {/* Sales */}
            <Link href="/history" className="flex flex-col items-center group">
              <span className="text-xl font-bold text-black leading-none -tracking-[0.4px]">
                {salesStats?.todaySalesCount ?? 0}
              </span>
              <span className="text-[13px] text-[#00000080] font-medium mt-1.5 transition-colors">
                Sales
              </span>
            </Link>

            {/* Orders */}
            <Link href="/history" className="flex flex-col items-center group">
              <span className="text-xl font-bold text-black leading-none -tracking-[0.4px]">
                {insights?.qrKitScans?.totalScans ?? 0}
              </span>
              <span className="text-[13px] text-[#00000080] font-medium mt-1.5 transition-colors">
                Orders
              </span>
            </Link>

            {/* Unconfirmed */}
            <Link
              href="/history?status=UNCONFIRMED"
              className="flex flex-col items-center group"
            >
              <span
                className="text-xl font-bold leading-none -tracking-[0.4px]"
                style={{
                  background:
                    'linear-gradient(135deg, #F5B041 0%, #BB8123 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {salesStats?.pendingSalesCount ?? 0}
              </span>
              <div className="flex items-center gap-0.5 mt-1.5 group-hover:opacity-80 transition-opacity">
                <span
                  className="text-[13px] font-medium"
                  style={{
                    background:
                      'linear-gradient(135deg, #F5B041 0%, #BB8123 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Unconfirmed
                </span>
                <ChevronRight size={11} color="#BB8123" />
              </div>
            </Link>

            {/* Owing */}
            <Link
              href="/outstanding"
              className="flex flex-col items-center group"
            >
              <span
                className="text-xl font-bold leading-none -tracking-[0.4px]"
                style={{
                  background:
                    'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {owingSales?.pagination?.total ?? 0}
              </span>
              <div className="flex items-center gap-0.5 mt-1.5 transition-opacity">
                <span
                  className="text-[13px] font-medium"
                  style={{
                    background:
                      'linear-gradient(135deg, #FB5012 0%, #D72483 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Owing
                </span>
                <ChevronRight size={11} color="#D72483" />
              </div>
            </Link>
          </div>
        </div>

        {/* Record */}
        <div className="border-t border-[#F1F1F1] mx-auto fixed bottom-0 left-0 right-0 bg-white rounded-t-[12px]">
          <div className="p-4 pb-6">
            <Button
              asChild
              className="w-full bg-black text-white rounded-[48px] h-12 font-bold"
            >
              <Link href="/record-sale">New Sale</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
