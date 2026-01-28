'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ChevronRight, ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import { PageHeader } from '@/components/layout/PageHeader'
import { useUserProfile, useUpdateProfilePhoto } from '@/services/users'
import { useAuthStore } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { LoaderCircle, showNotificationToast } from '@/components/ui'
import { getBankLogoPath, getBankInitial } from '@/lib/utils/bank-logos'
import { useDrawerStore } from '@/services/drawer'
import { useMerchantInsights } from '@/services/insights'
import { useUserQRKits } from '@/services/qr'
import Link from 'next/link'
import { BankCarousel } from '@/components/bank-accounts/bank-carousel'
import { sortBankAccounts } from '@/lib/utils/bank-account'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

export default function ProfilePage() {
  const router = useRouter()
  const { data: profile, isLoading } = useUserProfile()
  const { data: insights } = useMerchantInsights({ preset: 'last_7_days' })
  const { data: qrKitsData } = useUserQRKits()
  const updateProfilePhoto = useUpdateProfilePhoto()
  const hasQRKits = (qrKitsData?.data?.length ?? 0) > 0
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoSuccess, setPhotoSuccess] = useState(false)
  const [selectedBankIndex, setSelectedBankIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const openDrawer = useDrawerStore((state) => state.openDrawer)

  const user = useAuthStore((state) => state.user)
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

  const handleViewCustomerView = () => {
    // TODO: Navigate to customer view page or open in new tab
    if (profile?.merchantSlug) {
      window.open(`/merchant/${profile.merchantSlug}`, '_blank')
    }
  }

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

  // Render bank logo with fallback to initial
  const renderBankLogo = (bankName?: string) => {
    if (!bankName) return null

    const logoPath = getBankLogoPath(bankName)
    const isDefaultLogo = logoPath.includes('default-image.png')

    if (isDefaultLogo) {
      // Fallback to letter icon for banks without logos
      return (
        <div className="w-6 h-6 bg-[#0075FF] rounded-[6.67px] flex items-center justify-center">
          <span className="text-white font-bold text-xs">
            {getBankInitial(bankName)}
          </span>
        </div>
      )
    }

    return (
      <Image
        src={logoPath}
        alt={`${bankName} logo`}
        width={24}
        height={24}
        className="w-6 h-6 rounded-[6.67px] object-contain"
      />
    )
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-[#F4F6F8] flex items-center justify-center">
        <LoaderCircle innerBg="#F4F6F8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8]">
      <div className="max-w-[500px] mx-auto min-h-screen flex flex-col font-satoshi">
        <PageHeader
          title="Bank accounts"
          showDropdown
          onLogoClick={() => openDrawer({ type: 'profile-menu' })}
          onTitleClick={() =>
            openDrawer({
              type: 'select-bank',
              props: {
                bankAccounts: sortedBankAccounts,
                onSelectBank: (bank: any) => {
                  const index = sortedBankAccounts.findIndex(
                    (acc) => acc.accountNumber === bank.accountNumber,
                  )
                  if (index !== -1) {
                    setSelectedBankIndex(index)
                  }
                },
              },
            })
          }
          onShareClick={() => console.log('Share clicked')}
        />

        <div className="flex-1 px-4 pb-32 flex flex-col justify-evenly">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {profile?.profilePhotoUrl ? (
                <Image
                  src={profile.profilePhotoUrl}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="w-[96px] h-[96px] rounded-full object-cover"
                />
              ) : (
                <div className="w-[96px] h-[96px] rounded-full bg-[#CED7E1] flex items-center justify-center">
                  <Image
                    src="/icons/store_solid.svg"
                    alt="store icon"
                    width={57}
                    height={57}
                  />
                </div>
              )}

              {/* Upload overlay when uploading */}
              {updateProfilePhoto.isPending && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              <button
                type="button"
                onClick={handleCameraClick}
                disabled={updateProfilePhoto.isPending}
                className="absolute bottom-0 right-0 w-8 h-8 bg-[#E5E7EB] rounded-full flex items-center justify-center border-2 border-white disabled:opacity-50"
              >
                <Camera className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Photo error message */}
            {photoError && (
              <p className="text-xs text-red-500 mt-2 text-center">
                {photoError}
              </p>
            )}

            {/* Success message */}
            {photoSuccess && (
              <p className="text-xs text-green-600 mt-2 text-center">
                Photo updated successfully!
              </p>
            )}

            <h1 className="font-bold text-xl text-black mt-4 text-center leading-none">
              {profile?.businessName || 'Your Business Name'}
            </h1>

            {!hasQRKits ? (
              <Link
                href="/activate"
                className="mt-1 text-sm text-[#00000080] font-medium flex items-center gap-1"
              >
                1 more step: Activate your QR kit{' '}
                <ChevronRight className="w-4 h-4 text-[#747576]" />
              </Link>
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
                Your QR kit is live and accepting payments
                <ChevronRight className="w-4 h-4 text-[#24C166] mt-[1%]" />
              </Link>
            )}
          </div>

          {/* Bank Account Carousel */}
          {sortedBankAccounts.length > 0 && (
            <BankCarousel
              bankAccounts={sortedBankAccounts}
              initialIndex={selectedBankIndex}
              onIndexChange={setSelectedBankIndex}
            />
          )}

          {/* Stats Section - Link to Insights */}
          <Link href="/insights" className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-black leading-none mb-1">
                {insights?.qrKitScans?.totalScans ?? 0}
              </p>
              <div className="flex items-center justify-center gap-0.5">
                <p className="text-[13px] text-[#00000080] font-medium">
                  Scans this week
                </p>
                <ChevronRight className="w-3 h-3 text-[#00000080] mt-[1%]" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-xl font-bold text-black leading-none mb-1">
                {insights?.traffic?.customerBreakdown?.returningCustomers ?? 0}
              </p>
              <div className="flex items-center justify-center gap-0.5">
                <p className="text-[13px] text-[#00000080] font-medium">
                  Returning customers
                </p>
                <ChevronRight className="w-3 h-3 text-[#00000080] mt-[1%]" />
              </div>
            </div>
          </Link>
        </div>

        {/* QR Kit Button */}
        <div className="border-t border-[#F1F1F1] max-w-[500px] mx-auto  fixed bottom-0 left-0 right-0 bg-white rounded-2xl">
          <div className="p-4 pb-6">
            <Button
              asChild
              className="w-full bg-black text-white rounded-[48px] h-12 font-bold"
            >
              {!hasQRKits ? (
                <Link href="/activate">Activate your QR kit</Link>
              ) : (
                <Link href="/qr-kits">Manage QR kit</Link>
              )}
            </Button>

            <button
              onClick={handleViewCustomerView}
              type="button"
              className="w-full text-xs text-[#878F98] font-medium flex items-center justify-center gap-0.5 mt-4 underline underline-offset-4"
            >
              What my customers would see when they scan
              <ArrowUpRight className="w-3 h-3 text-[#878F98] mt-[1%]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
