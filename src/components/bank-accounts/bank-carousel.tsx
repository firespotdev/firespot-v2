'use client'

import * as React from 'react'
import { Copy, Check } from 'lucide-react'
import Image from 'next/image'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { getBankLogoPath, getBankInitial } from '@/lib/utils/bank-logos'
import { cn } from '@/lib/utils'
import { showNotificationToast } from '@/components/ui'

interface BankAccount {
  bankName: string
  accountNumber: string
  accountName?: string
  isPrimary?: boolean
}

interface BankCarouselProps {
  bankAccounts: BankAccount[]
  onCopy?: (accountNumber: string, bankName: string) => void
  initialIndex?: number
  onIndexChange?: (index: number) => void
  showDots?: boolean
  className?: string
}

export function BankCarousel({
  bankAccounts,
  onCopy,
  initialIndex = 0,
  onIndexChange,
  showDots = true,
  className,
}: BankCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)
  const [copiedAccount, setCopiedAccount] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on('select', () => {
      const index = api.selectedScrollSnap()
      setCurrent(index)
      onIndexChange?.(index)
    })
  }, [api, onIndexChange])

  // Scroll to initial index if it changes externally
  React.useEffect(() => {
    if (api && initialIndex !== undefined && initialIndex !== current) {
      api.scrollTo(initialIndex)
    }
  }, [api, initialIndex, current])

  const handleCopy = (accountNumber: string, bankName: string) => {
    navigator.clipboard.writeText(accountNumber)
    showNotificationToast({ message: 'Account number copied!' })
    
    if (onCopy) {
      onCopy(accountNumber, bankName)
    }
    
    setCopiedAccount(accountNumber)
    setTimeout(() => setCopiedAccount(null), 2000)
  }

  const renderBankLogo = (bankName: string) => {
    const logoPath = getBankLogoPath(bankName)
    const isDefaultLogo = logoPath.includes('default-image.png')

    if (isDefaultLogo) {
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

  return (
    <div className={cn('w-full flex flex-col items-center gap-4', className)}>
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {bankAccounts.map((account, index) => (
            <CarouselItem key={`${account.accountNumber}-${index}`}>
              <div className="bg-white rounded-2xl py-4 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] mx-0.5">
                <div className="flex flex-col justify-center items-center mb-4 px-4">
                  <p className="text-sm text-[#00000066] font-medium">
                    Receiving Bank
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {renderBankLogo(account.bankName)}
                    <p className="text-base font-bold text-black">
                      {account.bankName}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-center items-center border-t border-[#F1F1F1] pt-4 px-4">
                  <p className="text-sm text-[#00000066] font-medium mb-1">
                    Account number
                  </p>
                  <div className="flex items-center gap-1">
                    <p className="text-lg font-bold text-black">
                      {account.accountNumber}
                    </p>
                    <button
                      onClick={() => handleCopy(account.accountNumber, account.bankName)}
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
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Pagination Dots */}
      {showDots && count > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors duration-200',
                current === i ? 'bg-[#00000066]' : 'bg-[#0000001A]'
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
