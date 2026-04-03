'use client'

import * as React from 'react'
import { Copy, Check, ChevronRight, Camera } from 'lucide-react'
import Image from 'next/image'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { BankLogo } from '@/components/ui/bank-logo'
import { cn } from '@/lib/utils'
import { showNotificationToast } from '@/components/ui'
import { useEffect, useState } from 'react'

interface BankAccount {
  bankName: string
  accountNumber: string
  accountName?: string
  isPrimary?: boolean
}

interface MerchantInfo {
  profilePhotoUrl?: string
  businessName: string
  bankAccountCount: number
}

interface MerchantCardCarouselProps {
  bankAccounts: BankAccount[]
  merchantInfo: MerchantInfo
  disclaimer?: string
  onCopy?: (account: BankAccount) => void
  initialIndex?: number
  onIndexChange?: (index: number) => void
  showDots?: boolean
  className?: string
  clickableCard?: boolean
  showCameraButton?: boolean
  onCameraClick?: () => void
  isUploadingPhoto?: boolean
  qrKitStatus?: React.ReactNode
  onBankAccountsClick?: () => void
  variant?: 'default' | 'payment-centered'
}

export function MerchantCardCarousel({
  bankAccounts,
  merchantInfo,
  disclaimer,
  onCopy,
  initialIndex = 0,
  onIndexChange,
  showDots = true,
  className,
  clickableCard = false,
  showCameraButton = false,
  onCameraClick,
  isUploadingPhoto = false,
  qrKitStatus,
  onBankAccountsClick,
  variant = 'default',
}: MerchantCardCarouselProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null)

  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on('select', () => {
      const index = api.selectedScrollSnap()
      setCurrent(index)
      onIndexChange?.(index)
    })
  }, [api, onIndexChange])

  useEffect(() => {
    if (api && initialIndex !== undefined && initialIndex !== current) {
      api.scrollTo(initialIndex)
    }
  }, [api, initialIndex, current])

  const handleCopy = (account: BankAccount) => {
    navigator.clipboard.writeText(account.accountNumber)
    showNotificationToast({ message: 'Account number copied!' })

    if (onCopy) {
      onCopy(account)
    }

    setCopiedAccount(account.accountNumber)
    setTimeout(() => setCopiedAccount(null), 2000)
  }

  const isCentered = variant === 'payment-centered'
  const showProfileInternal = !isCentered

  return (
    <div className={cn('w-full flex flex-col items-center gap-4', className)}>
      {isCentered && (
        <div className="flex flex-col items-center px-4 w-full">
          <div className="relative">
            {merchantInfo.profilePhotoUrl ? (
              <Image
                src={merchantInfo.profilePhotoUrl}
                alt={merchantInfo.businessName}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#CED7E1] flex items-center justify-center">
                <Image
                  src="/icons/store_solid.svg"
                  alt="store icon"
                  width={57}
                  height={57}
                />
              </div>
            )}

            {isUploadingPhoto && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {showCameraButton && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onCameraClick?.()
                }}
                disabled={isUploadingPhoto}
                className="absolute bottom-0 right-0 w-8 h-8 bg-[#E5E7EB] rounded-full flex items-center justify-center border-2 border-white disabled:opacity-50"
              >
                <Camera className="w-4 h-4 text-black" />
              </button>
            )}
          </div>

          <h1 className="font-bold text-xl text-black mt-4 text-center leading-none">
            {merchantInfo.businessName}
          </h1>

          {qrKitStatus ? (
            qrKitStatus
          ) : (
            <span
              onClick={onBankAccountsClick}
              className="mt-1 text-sm text-[#00000080] font-medium flex items-center gap-1 cursor-pointer"
            >
              {merchantInfo.bankAccountCount} linked bank account
              {merchantInfo.bankAccountCount === 1 ? '' : 's'}
              <ChevronRight className="w-4 h-4 text-[#747576]" />
            </span>
          )}
        </div>
      )}

      <Carousel
        setApi={setApi}
        className={cn('w-full', isCentered && '-mx-4 w-[calc(100%+2rem)]')}
        opts={
          isCentered
            ? { align: 'center', containScroll: false, loop: true }
            : undefined
        }
      >
        <CarouselContent className={isCentered ? 'ml-0' : '-ml-4'}>
          {bankAccounts.map((account, index) => (
            <CarouselItem
              key={`${account.accountNumber}-${index}`}
              className={cn(
                isCentered ? 'basis-[85%] px-1' : 'basis-full pl-4',
              )}
            >
              <div>
                {/* Profile Section - Internal */}
                {showProfileInternal && (
                  <div className="flex flex-col items-center px-4">
                    <div className="relative">
                      {merchantInfo.profilePhotoUrl ? (
                        <Image
                          src={merchantInfo.profilePhotoUrl}
                          alt={merchantInfo.businessName}
                          width={96}
                          height={96}
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-[#CED7E1] flex items-center justify-center">
                          <Image
                            src="/icons/store_solid.svg"
                            alt="store icon"
                            width={57}
                            height={57}
                          />
                        </div>
                      )}

                      {/* Upload overlay when uploading */}
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}

                      {/* Camera button */}
                      {showCameraButton && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCameraClick?.()
                          }}
                          disabled={isUploadingPhoto}
                          className="absolute bottom-0 right-0 w-8 h-8 bg-[#E5E7EB] rounded-full flex items-center justify-center border-2 border-white disabled:opacity-50"
                        >
                          <Camera className="w-4 h-4 text-black" />
                        </button>
                      )}
                    </div>

                    <h1 className="font-bold text-xl text-black mt-4 text-center leading-none">
                      {merchantInfo.businessName}
                    </h1>

                    {/* QR Kit Status (profile page) or linked accounts (pay page) */}
                    {qrKitStatus ? (
                      qrKitStatus
                    ) : (
                      <span
                        onClick={onBankAccountsClick}
                        className="mt-1 text-sm text-[#00000080] font-medium flex items-center gap-1 cursor-pointer"
                      >
                        {merchantInfo.bankAccountCount} linked bank account
                        {merchantInfo.bankAccountCount === 1 ? '' : 's'}
                        <ChevronRight className="w-4 h-4 text-[#747576]" />
                      </span>
                    )}
                  </div>
                )}

                {/* Bank Details Section */}
                <div
                  className={cn(
                    'bg-white rounded-2xl py-4 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] mx-0.5',
                    showProfileInternal ? 'mt-6' : 'mt-0',
                  )}
                >
                  <div className="flex flex-col justify-center items-center px-4">
                    <p className="text-sm text-[#00000066] font-medium">
                      Receiving Bank
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <BankLogo
                        bankName={account.bankName}
                        size={24}
                        className="rounded-[6.67px]"
                      />
                      <p className="text-base font-bold text-black">
                        {account.bankName}
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={
                      clickableCard ? () => handleCopy(account) : undefined
                    }
                    className="flex flex-col justify-center items-center border-t border-[#F1F1F1] mt-4 pt-4 px-4"
                  >
                    <p className="text-sm text-[#00000066] font-medium mb-1">
                      Account number
                    </p>
                    <div className="flex items-center gap-1">
                      <p className="text-lg font-bold text-black">
                        {account.accountNumber}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(account)
                        }}
                        type="button"
                        className="p-1 rounded"
                      >
                        {copiedAccount === account.accountNumber ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#878F98]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Disclaimer Section - Internal */}
                {disclaimer && showProfileInternal && (
                  <div className="mt-4 px-4">
                    <p className="text-xs text-[#00000066] text-center">
                      {disclaimer}
                    </p>
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Pagination Dots - Outside carousel */}
      {showDots && count > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors duration-200',
                current === i ? 'bg-[#00000066]' : 'bg-[#0000001A]',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
