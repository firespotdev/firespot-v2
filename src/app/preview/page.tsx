'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/services/auth'
import { useUserProfile } from '@/services/users'
import { LoaderCircle, showNotificationToast } from '@/components/ui'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { useDrawerStore } from '@/services/drawer'
import { MerchantCardCarousel } from '@/components/bank-accounts/merchant-card-carousel'
import { sortBankAccounts } from '@/lib/utils/bank-account'

export default function PreviewPage() {
  const router = useRouter()
  const [selectedBankIndex, setSelectedBankIndex] = useState(0)
  const openDrawer = useDrawerStore((state) => state.openDrawer)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const { data: profile, isLoading } = useUserProfile()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoaderCircle innerBg="#FFFFFF" />
      </div>
    )
  }

  if (!profile || !profile.bankAccounts || profile.bankAccounts.length === 0) {
    return (
      <div className="h-screen bg-[#F4F6F8] overflow-hidden">
        <div className="max-w-125 mx-auto h-full flex flex-col font-satoshi">
          <header className="sticky top-0 w-full z-50 bg-[#F4F6F8] flex items-center justify-between px-4 py-2">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center"
            >
              <ArrowLeft size={24} strokeWidth={2} />
            </button>
            <div className="flex flex-col items-center">
              <h1 className="text-base font-bold text-black">Preview</h1>
            </div>
            <div className="w-10" />
          </header>

          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <p className="text-center text-[#00000080] font-medium">
              Add a bank account to see what your customers would see when they scan your QR code.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push('/bank-accounts')}
            >
              Add Bank Account
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const sortedBankAccounts = sortBankAccounts(profile.bankAccounts)
  const bankAccount =
    sortedBankAccounts[selectedBankIndex] || sortedBankAccounts[0]

  const handleOpenBankDrawer = () => {
    if (!profile.bankAccounts || profile.bankAccounts.length === 0) {
      return
    }

    openDrawer({
      type: 'select-bank',
      direction: 'bottom',
      props: {
        bankAccounts: sortedBankAccounts,
        onSelectBank: (bank: { accountNumber: string }) => {
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

  const handleSendWithBankApp = () => {
    if (bankAccount) {
      const { accountNumber, bankName, accountName } = bankAccount

      navigator.clipboard.writeText(accountNumber)
      showNotificationToast({
        message: 'Account number copied!',
        duration: 2000,
      })

      openDrawer({
        type: 'bank-transfer',
        props: {
          accountNumber,
          bankName,
          accountName,
        },
      })
    }
  }

  return (
    <div className="h-screen bg-[#F4F6F8] overflow-hidden">
      <div className="max-w-125 mx-auto h-full flex flex-col font-satoshi">
        <PageHeader
          title="Transfer to"
          showDropdown
          onTitleClick={handleOpenBankDrawer}
        />

        <div className="flex-1 px-4 pb-32 flex flex-col justify-evenly overflow-y-auto">
          {/* Merchant Card Carousel */}
          {sortedBankAccounts.length > 0 && (
            <MerchantCardCarousel
              bankAccounts={sortedBankAccounts}
              merchantInfo={{
                profilePhotoUrl: profile.profilePhotoUrl,
                businessName: profile.businessName || '',
                bankAccountCount: profile.bankAccounts?.length || 0,
              }}
              disclaimer="This is a preview of what your customers see when they scan your QR code."
              initialIndex={selectedBankIndex}
              onIndexChange={setSelectedBankIndex}
              clickableCard={true}
              onCopy={(account) => {
                navigator.clipboard.writeText(account.accountNumber)
                showNotificationToast({
                  message: 'Account number copied!',
                  duration: 2000,
                })
                openDrawer({
                  type: 'bank-transfer',
                  props: {
                    accountNumber: account.accountNumber,
                    bankName: account.bankName,
                    accountName: account.accountName,
                  },
                })
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#F1F1F1] fixed bottom-0 left-0 right-0 bg-white rounded-2xl">
          <div className="max-w-125 mx-auto p-4 pb-6">
            <Button
              className="w-full bg-black text-white rounded-[48px] h-12 font-bold"
              onClick={handleSendWithBankApp}
            >
              Send with my bank app
            </Button>

            <Link
              href="/profile"
              className="w-full text-xs text-[#878F98] font-medium flex items-center justify-center gap-0.5 mt-4 underline underline-offset-4"
            >
              Back to profile
              <ArrowUpRight className="w-3 h-3 text-[#878F98] mt-[1%]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
