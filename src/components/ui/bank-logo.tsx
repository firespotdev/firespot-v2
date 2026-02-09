'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getBankLogoPath, BANK_PLACEHOLDER } from '@/lib/utils/bank-logos'
import { cn } from '@/lib/utils'

interface BankLogoProps {
  bankName: string
  size?: number
  className?: string
}

export function BankLogo({ bankName, size = 40, className = '' }: BankLogoProps) {
  const [src, setSrc] = useState(() => getBankLogoPath(bankName))

  const handleError = () => {
    if (src !== BANK_PLACEHOLDER) {
      setSrc(BANK_PLACEHOLDER)
    }
  }

  return (
    <div
      className={cn('relative overflow-hidden bg-white', className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={`${bankName || 'Bank'} logo`}
        fill
        className="object-cover"
        onError={handleError}
      />
    </div>
  )
}
