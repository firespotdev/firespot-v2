'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Copy, ChevronRight, ExternalLink, Store } from 'lucide-react'
import Image from 'next/image'
import { PageHeader } from '@/components/layout/PageHeader'
import { useUserProfile, useInitiateActivation } from '@/services/users'
import { useAuthStore } from '@/services/auth'
import { Button } from '@/components/ui/button'
import { LoaderCircle } from '@/components/ui'

export default function ProfilePage() {
  const router = useRouter()
  const { data: profile, isLoading, error } = useUserProfile()
  const initiateActivation = useInitiateActivation()
  const [copied, setCopied] = useState(false)

  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/login')
    }
  }, [isAuthenticated, isLoading, router])

  if (!isAuthenticated) {
    return null
  }

  const primaryBankAccount = profile?.bankAccounts?.find((acc) => acc.isPrimary)
  const bankAccount = primaryBankAccount || profile?.bankAccounts?.[0]

  const handleCopyAccountNumber = () => {
    if (bankAccount?.accountNumber) {
      navigator.clipboard.writeText(bankAccount.accountNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleActivateQRKit = () => {
    // TODO: Implement QR kit activation flow
    // This would typically open a modal or navigate to activation page
    console.log('Activate QR kit clicked')
  }

  const handleActivationStep = () => {
    // TODO: Navigate to activation page or show activation modal
    console.log('Activation step clicked')
  }

  const handleViewCustomerView = () => {
    // TODO: Navigate to customer view page or open in new tab
    if (profile?.merchantSlug) {
      window.open(`/merchant/${profile.merchantSlug}`, '_blank')
    }
  }

  // Get bank icon/color (simplified - in production, you'd have a bank icon mapping)
  const getBankIcon = (bankName?: string) => {
    if (!bankName) return null

    // Special handling for Moniepoint
    if (bankName.toLowerCase().includes('moniepoint')) {
      return (
        <div className="w-6 h-6 bg-[#0075FF] rounded-[6.67px] flex items-center justify-center">
          <span className="text-white font-bold text-xs">M</span>
        </div>
      )
    }

    // Generic bank icon with first letter
    const firstLetter = bankName.charAt(0).toUpperCase()
    return (
      <div className="w-6 h-6 bg-[#0075FF] rounded-[6.67px] flex items-center justify-center">
        <span className="text-white font-bold text-xs">{firstLetter}</span>
      </div>
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
    <div className="min-h-screen bg-[#F4F6F8] pb-4 font-satoshi">
      <PageHeader
        title="Bank accounts"
        showDropdown
        onShareClick={() => console.log('Share clicked')}
      />

      <div className="px-4 space-y-6">
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center pt-2">
          <div className="relative">
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
                  src="/store_solid.svg"
                  alt="store icon"
                  width={57}
                  height={57}
                />
              </div>
            )}
            <button
              type="button"
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#E5E7EB] rounded-full flex items-center justify-center border-2 border-white"
            >
              <Camera className="w-4 h-4 text-black" />
            </button>
          </div>

          <h1 className="font-bold text-xl text-black mt-4 text-center leading-none">
            {profile?.businessName || 'Your Business Name'}
          </h1>

          {!profile?.merchantSlug && (
            <button
              onClick={handleActivationStep}
              type="button"
              className="mt-1 text-sm text-[#00000080] font-medium flex items-center gap-1"
            >
              1 more step: Activate your QR kit{' '}
              <ChevronRight className="w-4 h-4 text-[#747576]" />
            </button>
          )}
        </div>

        {/* Bank Account Card */}
        {bankAccount && (
          <div className="bg-white rounded-2xl py-4 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col justify-center items-center mb-4 px-4">
              <p className="text-sm text-[#00000066] font-medium">
                Receiving Bank
              </p>
              <div className="flex items-center gap-2 mt-1">
                {getBankIcon(bankAccount.bankName)}
                <p className="text-base font-bold text-black">
                  {bankAccount.bankName}
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center items-center border-t border-[#F1F1F1] pt-4 px-4">
              <p className="text-sm text-[#00000066] font-medium mb-1">
                Account number
              </p>
              <div className="flex items-center gap-1">
                <p className="text-lg font-bold text-black">
                  {bankAccount.accountNumber}
                </p>
                <button
                  onClick={handleCopyAccountNumber}
                  type="button"
                  className="p-1 rounded"
                >
                  <Copy className="w-4 h-4 text-[#878F98]" />
                </button>
                {copied && (
                  <span className="text-xs text-green-600">Copied!</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <p className="text-xl font-bold text-black leading-none mb-1">28</p>
            <div className="flex items-center justify-center gap-0.5">
              <p className="text-[13px] text-[#00000080] font-medium">
                Scans this week
              </p>
              <ChevronRight className="w-3 h-3 text-[#00000080] mt-[1%]" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-xl font-bold text-black leading-none mb-1">7</p>
            <div className="flex items-center justify-center gap-0.5">
              <p className="text-[13px] text-[#00000080] font-medium">
                Returning customers
              </p>
              <ChevronRight className="w-3 h-3 text-[#00000080] mt-[1%]" />
            </div>
          </div>
        </div>

        {/* Activate QR Kit Button */}
        <div className="border-t border-[#F1F1F1] fixed bottom-0 left-0 right-0 bg-white p-4 rounded-2xl">
          {!profile?.merchantSlug && (
            <Button
              onClick={handleActivateQRKit}
              className="w-full bg-black text-white rounded-[48px] h-12 font-bold"
            >
              Activate your QR kit
            </Button>
          )}

          <button
            onClick={handleViewCustomerView}
            type="button"
            className="w-full text-sm text-[#00000080] flex items-center justify-center gap-1 mt-2"
          >
            What my customers would see when they scan
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
