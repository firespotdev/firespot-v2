'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { PageHeader } from '@/components/layout/PageHeader'
import { useUserProfile, useUpdateBusinessImage } from '@/services/users'
import { Button } from '@/components/ui/button'
import { LoaderCircle, VerifiedBadge } from '@/components/ui'
import { useDrawerStore } from '@/services/drawer'
import type { InsightsQuery } from '@/services/insights'
import { useUserQRKits } from '@/services/qr'
import { useOutstandingSummary, useSalesStats } from '@/services/sales/hooks'
import Link from 'next/link'
import { sortBankAccounts } from '@/lib/utils/bank-registry'
import { MerchantInfoStat } from '@/components/profile/merchant-info-stat'
import { MerchantQuickActionStack } from '@/components/merchant/merchant-quick-actions'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export default function ProfilePage() {
  const [filter, setFilter] = useState<InsightsQuery>({
    preset: 'today',
  })
  const { data: profile, isLoading } = useUserProfile()
  const { data: qrKitsData } = useUserQRKits()
  const { data: salesStats } = useSalesStats(filter)
  const { data: collectedStats } = useSalesStats({
    ...filter,
    mode: 'collected',
  })
  const { data: recordedStats } = useSalesStats({ ...filter, mode: 'recorded' })
  const { data: outstandingSummary } = useOutstandingSummary()
  const owingCount = outstandingSummary?.customers?.length ?? 0
  const updateBusinessImage = useUpdateBusinessImage()
  const hasQRKits = (qrKitsData?.data?.length ?? 0) > 0
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoSuccess, setPhotoSuccess] = useState(false)
  const [isAmountHidden, setIsAmountHidden] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const searchParams = useSearchParams()
  const hasOpenedVerify = useRef(false)

  // Auth + merchant capability are enforced by the (merchant) layout.

  // Arriving from the plan success screen ("Set up Shop") opens the
  // "Verify your identity" drawer straight away.
  useEffect(() => {
    if (searchParams.get('verify') === '1' && !hasOpenedVerify.current) {
      hasOpenedVerify.current = true
      openDrawer({ type: 'verify-identity' })
    }
  }, [searchParams, openDrawer])

  // Clear photo success message after 3 seconds
  useEffect(() => {
    if (photoSuccess) {
      const timer = setTimeout(() => setPhotoSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [photoSuccess])

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
    updateBusinessImage.mutate(file, {
      onSuccess: () => {
        setPhotoSuccess(true)
      },
      onError: (error: unknown) => {
        const response = error as { response?: { data?: { message?: string } } }
        const message =
          response.response?.data?.message || 'Failed to upload business image'
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
          imageUrl: profile?.businessImageUrl || profile?.profilePhotoUrl,
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
          title={'Main Address'}
          subtitle="Owner"
          titleAdornment={null}
          showDropdown
          onLogoClick={() => openDrawer({ type: 'profile-menu' })}
          onTitleClick={() =>
            openDrawer({ type: 'account-switch', props: { mode: 'merchant' } })
          }
          onShareClick={handleShareClick}
        />

        <div className="flex-1 px-4 pb-24 flex flex-col justify-evenly overflow-y-auto">
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
                businessImageUrl:
                  profile?.businessImageUrl || profile?.profilePhotoUrl,
                businessName: profile?.businessName || 'My Business',
                bankAccountCount: sortedBankAccounts.length,
                effectiveVerificationLevel: profile?.effectiveVerificationLevel,
              }}
              showCameraButton={true}
              onCameraClick={handleCameraClick}
              isUploadingPhoto={updateBusinessImage.isPending}
              todaySalesAmount={salesStats?.todaySalesAmount ?? 0}
              collectedAmount={collectedStats?.todaySalesAmount ?? 0}
              recordedAmount={recordedStats?.todaySalesAmount ?? 0}
              confirmedAmount={salesStats?.todaySalesAmount ?? 0}
              unconfirmedAmount={salesStats?.pendingSalesAmount ?? 0}
              confirmedCount={salesStats?.todaySalesCount ?? 0}
              unconfirmedCount={salesStats?.pendingSalesCount ?? 0}
              salesCount={salesStats?.todaySalesCount ?? 0}
              ordersCount={0}
              owingCount={owingCount}
              quickActions={<MerchantQuickActionStack className="mb-4" />}
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
                    Next step: Activate your QR kit{' '}
                    <ChevronRight className="w-4 h-4 text-[#747576]" />
                  </Button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      openDrawer({ type: 'payment-methods-active' })
                    }
                    className="mt-1 text-sm text-[#24C166] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Image
                      src="/icons/ping.svg"
                      alt="live ping"
                      width={16}
                      height={16}
                      className="animate-pulse"
                    />
                    4 payment methods active
                    <ChevronRight className="w-4 h-4 text-[#24C166] mt-[1%]" />
                  </button>
                )
              }
            />
          )}

          {/* Business image error message */}
          {photoError && (
            <p className="text-xs text-red-500 mt-2 text-center">
              {photoError}
            </p>
          )}

          {/* Business image success message */}
          {photoSuccess && (
            <p className="text-xs text-green-600 mt-2 text-center">
              Business image updated successfully!
            </p>
          )}

          {/* Stats Section - Inquiries, Bookings, New orders, Owing */}
          <div className="grid grid-cols-4 gap-2 w-full text-center">
            {/* Inquiries */}
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-black leading-none -tracking-[0.4px]">
                0
              </span>
              <span className="text-[13px] text-[#00000080] font-medium mt-1.5">
                Inquiries
              </span>
            </div>

            {/* Bookings */}
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-black leading-none -tracking-[0.4px]">
                0
              </span>
              <span className="text-[13px] text-[#00000080] font-medium mt-1.5">
                Bookings
              </span>
            </div>

            {/* New orders */}
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-black leading-none -tracking-[0.4px]">
                0
              </span>
              <span className="text-[13px] text-[#00000080] font-medium mt-1.5">
                New orders
              </span>
            </div>

            {/* Owing */}
            <Link
              href="/outstanding"
              className="flex flex-col items-center group"
            >
              <span className="text-xl font-bold leading-none -tracking-[0.4px] text-[#E23B4E]">
                {owingCount}
              </span>
              <div className="flex items-center gap-0.5 mt-1.5 transition-opacity">
                <span className="text-[13px] font-medium text-[#E23B4E]">
                  Owing
                </span>
                <ChevronRight size={11} color="#E23B4E" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
